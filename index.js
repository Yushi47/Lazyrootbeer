String.prototype.clr = function (hexColor) { return `<font color="#${hexColor}">${this}</font>` }

const fs = require('fs');
const path = require('path');

const ITEMS_CONFIG_PATH = path.join(__dirname, 'items.json');
const SKILLS_CONFIG_PATH = path.join(__dirname, 'skills.json'); 
const DEFAULT_ROOTBEER_ID = 80081;

module.exports = function Lazyrootbeer(mod){

    let itemsConfig = { 
        activeBroochId: null,
        activeRootbeerId: DEFAULT_ROOTBEER_ID
    };

    let skillsConfig = {}; 

    function loadItemsConfig() {
        try {
            if (fs.existsSync(ITEMS_CONFIG_PATH)) {
                const rawData = fs.readFileSync(ITEMS_CONFIG_PATH);
                const loadedConfig = JSON.parse(rawData);
                itemsConfig = { ...itemsConfig, ...loadedConfig };
                if (itemsConfig.activeBroochId === undefined || typeof itemsConfig.activeBroochId !== 'number' && itemsConfig.activeBroochId !== null) {
                    itemsConfig.activeBroochId = null;
                }
                if (itemsConfig.activeRootbeerId === undefined || typeof itemsConfig.activeRootbeerId !== 'number') {
                    itemsConfig.activeRootbeerId = DEFAULT_ROOTBEER_ID;
                }
                // mod.log('[Lazyrootbeer] items.json loaded.');
            } else {
                // File doesn't exist, use in-memory defaults. Updater should provide it from GitHub if missing.
                mod.log('[Lazyrootbeer] items.json not found. Using default item IDs. Updater may download it from repository.');
            }
        } catch (error) {
            mod.error('[Lazyrootbeer] Error loading items.json: ' + error);
            itemsConfig = { activeBroochId: null, activeRootbeerId: DEFAULT_ROOTBEER_ID }; // Fallback to safe defaults
        }
    }

    function saveItemsConfig() {
        try {
            fs.writeFileSync(ITEMS_CONFIG_PATH, JSON.stringify(itemsConfig, null, 2));
            // Removed debug log for saving: if(debug) mod.log('[Lazyrootbeer] items.json saved.');
        } catch (error) {
            mod.error('[Lazyrootbeer] Error saving items.json: ' + error);
        }
    }

    function loadSkillsConfig() {
        try {
            if (fs.existsSync(SKILLS_CONFIG_PATH)) {
                const fileContent = fs.readFileSync(SKILLS_CONFIG_PATH, 'utf8');
                skillsConfig = JSON.parse(fileContent); 
                // mod.log('[Lazyrootbeer] skills.json loaded and parsed.');
            } else {
                skillsConfig = {}; // Initialize empty if file doesn't exist. Updater should provide it.
                mod.log('[Lazyrootbeer] skills.json not found. Using empty skill config. Updater may download it from repository.');
            }
        } catch (error) {
            mod.error('[Lazyrootbeer] Error loading skills.json: ' + error + ". Please ensure it's a valid JSON file.");
            skillsConfig = {}; 
        }
    }

    function saveSkillsConfig() {
        try {
            fs.writeFileSync(SKILLS_CONFIG_PATH, JSON.stringify(skillsConfig, null, 2), 'utf8');
            // Removed debug log for saving as per user request for skills.json
        } catch (error) {
            mod.error('[Lazyrootbeer] Error saving skills.json: ' + error);
        }
    }
    
    loadItemsConfig();
    loadSkillsConfig();

    let enabled = true,
        debug = false,
        learnMode = null, 
        brooch = { id : itemsConfig.activeBroochId, cooldown : 0 },
        rootbeer = { id : itemsConfig.activeRootbeerId, cooldown : 0 },
        useBroochOn = [],
        useRootBeerOn = [],
        useOutOfCombat = false,
        delay = 0;

    if (brooch.id) mod.log(`[Lazyrootbeer] Active brooch ID: ${brooch.id}`);
    else mod.log(`[Lazyrootbeer] Brooch ID not set. Use '/au learnbrooch' then '/au setbrooch <id>'.`);
    mod.log(`[Lazyrootbeer] Active Root Beer ID: ${rootbeer.id}`);

    function getCurrentClass() {
        if (mod.game && mod.game.me) {
            return mod.game.me.class;
        }
        return 'unknown'; 
    }

    function ensureClassConfig(className) {
        if (className === 'unknown' && debug) {
            mod.log('[Lazyrootbeer] Warning: Current class is unknown, cannot ensure skill config yet.');
            return { 
                useBroochOn: [], useRootBeerOn: [], useOutOfCombat: false, delay: 0
            };
        }
        if (!skillsConfig[className]) {
            skillsConfig[className] = {
                useBroochOn: [],
                useRootBeerOn: [],
                useOutOfCombat: false,
                delay: 0 
            };
            mod.log(`[Lazyrootbeer] Initialized default skill config for class: ${className}`);
             // saveSkillsConfig(); // Save when a new class config is created by a command later
        }
        
        // Ensure correct types for loaded config
        if (!Array.isArray(skillsConfig[className].useBroochOn)) skillsConfig[className].useBroochOn = [];
        if (!Array.isArray(skillsConfig[className].useRootBeerOn)) skillsConfig[className].useRootBeerOn = [];
        
        if (typeof skillsConfig[className].useOutOfCombat !== 'boolean') {
            if(debug) mod.log(`[Lazyrootbeer] Corrected 'useOutOfCombat' type for class ${className} to boolean (defaulted to false).`);
            skillsConfig[className].useOutOfCombat = false;
        }
        if (typeof skillsConfig[className].delay !== 'number') {
             if(debug) mod.log(`[Lazyrootbeer] Corrected 'delay' type for class ${className} to number (defaulted to 0).`);
            skillsConfig[className].delay = 0;
        }
        
        return skillsConfig[className];
    }
    
    function updateOperationalSkillsConfig(className) {
        if (className === 'unknown') { 
            if(debug) mod.log('[Lazyrootbeer] Cannot update operational skills: class unknown.');
            return;
        }
        const classCfg = ensureClassConfig(className);
        useBroochOn = [...classCfg.useBroochOn];
        useRootBeerOn = [...classCfg.useRootBeerOn];
        useOutOfCombat = classCfg.useOutOfCombat;
        delay = classCfg.delay;
    }


    mod.command.add('au', (arg, arg2, arg3) => {
        if(arg){
            arg = arg.toLowerCase();
            const currentClass = getCurrentClass();
            if (currentClass === 'unknown' && !['on', 'off', 'debug', 'help'].includes(arg)) {
                mod.command.message('[Lazyrootbeer] Character not fully loaded. Please try again shortly.'.clr('FF0000'));
                return;
            }
            let classCfg = ensureClassConfig(currentClass); 

            switch(arg) {
                case 'on': enabled = true; mod.command.message('[Lazyrootbeer] Enabled.'.clr('00FF33')); break;
                case 'off': enabled = false; mod.command.message('[Lazyrootbeer] Disabled.'.clr('FF0000')); break;
                case 'debug': debug = !debug; mod.command.message(`[Lazyrootbeer] Debug Status : ${debug}`); break;
                
                case 'learnbrooch': learnMode = 'brooch'; mod.command.message('[Lazyrootbeer] Learn Brooch: Hover over brooch.'.clr('FFFF00')); break;
                case 'setbrooch':
                    if(arg2 && !isNaN(parseInt(arg2))) {
                        brooch.id = parseInt(arg2);
                        itemsConfig.activeBroochId = brooch.id;
                        saveItemsConfig();
                        mod.command.message(`[Lazyrootbeer] Brooch ID set & saved: ${brooch.id}.`.clr('00FFFF'));
                    } else mod.command.message('[Lazyrootbeer] Usage: /au setbrooch <itemID>'.clr('FF0000'));
                    break;
                case 'clearbrooch':
                    brooch.id = null; itemsConfig.activeBroochId = null; saveItemsConfig();
                    mod.command.message('[Lazyrootbeer] Brooch ID cleared.'.clr('FFA500'));
                    break;

                case 'learnrootbeer': learnMode = 'rootbeer'; mod.command.message('[Lazyrootbeer] Learn Root Beer: Hover over item.'.clr('FFFF00')); break;
                case 'setrootbeer':
                    if(arg2 && !isNaN(parseInt(arg2))) {
                        rootbeer.id = parseInt(arg2);
                        itemsConfig.activeRootbeerId = rootbeer.id;
                        saveItemsConfig();
                        mod.command.message(`[Lazyrootbeer] Root Beer ID set & saved: ${rootbeer.id}.`.clr('00FFFF'));
                    } else mod.command.message('[Lazyrootbeer] Usage: /au setrootbeer <itemID>'.clr('FF0000'));
                    break;
                case 'clearrootbeer':
                    rootbeer.id = DEFAULT_ROOTBEER_ID; itemsConfig.activeRootbeerId = DEFAULT_ROOTBEER_ID; saveItemsConfig();
                    mod.command.message(`[Lazyrootbeer] Root Beer ID reset to default: ${rootbeer.id}.`.clr('FFA500'));
                    break;
                
                case 'checkitems': 
                    mod.command.message(`[Lazyrootbeer] Active Brooch ID: ${brooch.id || 'Not set'}`.clr('00FFFF'));
                    mod.command.message(`[Lazyrootbeer] Active Root Beer ID: ${rootbeer.id}`.clr('00FFFF'));
                    break;

                case 'addbroochskill':
                    if(arg2 && !isNaN(parseInt(arg2))) {
                        const skillId = parseInt(arg2);
                        if (!classCfg.useBroochOn.includes(skillId)) {
                            classCfg.useBroochOn.push(skillId);
                            saveSkillsConfig(); // Save after modification
                            updateOperationalSkillsConfig(currentClass);
                            mod.command.message(`Skill ${skillId} added to Brooch list for ${currentClass}.`.clr('00FF00'));
                        } else mod.command.message(`Skill ${skillId} already in Brooch list for ${currentClass}.`.clr('FFFF00'));
                    } else mod.command.message('Usage: /au addbroochskill <skillId>'.clr('FF0000'));
                    break;
                case 'delbroochskill':
                     if(arg2 && !isNaN(parseInt(arg2))) {
                        const skillId = parseInt(arg2);
                        const index = classCfg.useBroochOn.indexOf(skillId);
                        if (index > -1) {
                            classCfg.useBroochOn.splice(index, 1);
                            saveSkillsConfig(); // Save after modification
                            updateOperationalSkillsConfig(currentClass);
                            mod.command.message(`Skill ${skillId} removed from Brooch list for ${currentClass}.`.clr('00FF00'));
                        } else mod.command.message(`Skill ${skillId} not found in Brooch list for ${currentClass}.`.clr('FF0000'));
                    } else mod.command.message('Usage: /au delbroochskill <skillId>'.clr('FF0000'));
                    break;
                case 'addrootskill':
                     if(arg2 && !isNaN(parseInt(arg2))) {
                        const skillId = parseInt(arg2);
                        if (!classCfg.useRootBeerOn.includes(skillId)) {
                            classCfg.useRootBeerOn.push(skillId);
                            saveSkillsConfig(); // Save after modification
                            updateOperationalSkillsConfig(currentClass);
                            mod.command.message(`Skill ${skillId} added to Root Beer list for ${currentClass}.`.clr('00FF00'));
                        } else mod.command.message(`Skill ${skillId} already in Root Beer list for ${currentClass}.`.clr('FFFF00'));
                    } else mod.command.message('Usage: /au addrootskill <skillId>'.clr('FF0000'));
                    break;
                case 'delrootskill':
                    if(arg2 && !isNaN(parseInt(arg2))) {
                        const skillId = parseInt(arg2);
                        const index = classCfg.useRootBeerOn.indexOf(skillId);
                        if (index > -1) {
                            classCfg.useRootBeerOn.splice(index, 1);
                            saveSkillsConfig(); // Save after modification
                            updateOperationalSkillsConfig(currentClass);
                            mod.command.message(`Skill ${skillId} removed from Root Beer list for ${currentClass}.`.clr('00FF00'));
                        } else mod.command.message(`Skill ${skillId} not found in Root Beer list for ${currentClass}.`.clr('FF0000'));
                    } else mod.command.message('Usage: /au delrootskill <skillId>'.clr('FF0000'));
                    break;
                case 'togglecombat':
                    classCfg.useOutOfCombat = !classCfg.useOutOfCombat;
                    saveSkillsConfig(); // Save after modification
                    updateOperationalSkillsConfig(currentClass);
                    mod.command.message(`useOutOfCombat for ${currentClass} set to: ${classCfg.useOutOfCombat}.`.clr('00FFFF'));
                    break;
                case 'setdelay':
                    if(arg2 && !isNaN(parseFloat(arg2))) { 
                        const newDelay = parseInt(arg2); 
                        if (newDelay >= 0) {
                            classCfg.delay = newDelay;
                            saveSkillsConfig(); // Save after modification
                            updateOperationalSkillsConfig(currentClass);
                            mod.command.message(`Delay for ${currentClass} set to: ${classCfg.delay}ms.`.clr('00FFFF'));
                        } else mod.command.message('Delay must be a non-negative number (milliseconds).'.clr('FF0000'));
                    } else mod.command.message('Usage: /au setdelay <milliseconds> (e.g., 100 for 0.1s)'.clr('FF0000'));
                    break;
                case 'showskills': 
                    mod.command.message(`--- Config for ${currentClass} ---`.clr('00FFFF'));
                    mod.command.message(`Brooch Skills: ${classCfg.useBroochOn.join(', ') || 'None'}`.clr('FFFFFF'));
                    mod.command.message(`RootBeer Skills: ${classCfg.useRootBeerOn.join(', ') || 'None'}`.clr('FFFFFF'));
                    mod.command.message(`Use Out of Combat: ${classCfg.useOutOfCombat}`.clr('FFFFFF'));
                    mod.command.message(`Delay: ${classCfg.delay}ms`.clr('FFFFFF'));
                    break;

                case 'help':
                    mod.command.message('--- Lazyrootbeer Help ---'.clr('00FFFF'));
                    mod.command.message('/au on | off | debug'.clr('FFFFFF'));
                    mod.command.message('/au learnbrooch | setbrooch <id> | clearbrooch'.clr('FFFFFF'));
                    mod.command.message('/au learnrootbeer | setrootbeer <id> | clearrootbeer'.clr('FFFFFF'));
                    mod.command.message('/au addbroochskill <id> | delbroochskill <id>'.clr('FFFFFF'));
                    mod.command.message('/au addrootskill <id> | delrootskill <id>'.clr('FFFFFF'));
                    mod.command.message('/au togglecombat | setdelay <ms> | showskills'.clr('FFFFFF'));
                    mod.command.message('/au checkitems (shows active item IDs)'.clr('FFFFFF'));
                    break;
                default:
                    mod.command.message(`[Lazyrootbeer] Unknown command: ${arg}. See /au help.`.clr('FF0000'));
            }
        }
        else {
             mod.command.message('[Lazyrootbeer] See /au help for commands.'.clr('FFFFFF'));
        }
    });

    let useItem = (item, loc, w) => {
        if (!item || item === 0) {
            if(debug) mod.command.message(`[Lazyrootbeer] Attempted to use an invalid item ID: ${item}`.clr('FF0000'));
            return;
        }
        mod.send('C_USE_ITEM', 3, {
            gameId: mod.game.me.gameId,
            id: item,
            dbid: 0,
            target: 0,
            amount: 1,
            dest: { x: 0, y: 0, z: 0 },
            loc: loc,
            w: w,
            unk1: 0,
            unk2: 0,
            unk3: 0,
            unk4: true
        });
        if(debug) mod.command.message(`[Lazyrootbeer] Used item: ${item}`.clr('00FF00'));
    };

    let handle = (skillInfo) => {
        if(!enabled || (!useOutOfCombat && !mod.game.me.inCombat) || mod.game.me.inBattleground) return;

        if(brooch.id && useBroochOn.includes(skillInfo.skill.id) && Date.now() > brooch.cooldown) {
            setTimeout(() => {
                if (enabled && brooch.id) useItem(brooch.id, skillInfo.loc, skillInfo.w);
            }, delay);
        }
        if(rootbeer.id && useRootBeerOn.includes(skillInfo.skill.id) && Date.now() > rootbeer.cooldown) {
            setTimeout(() => {
                 if (enabled && rootbeer.id) useItem(rootbeer.id, skillInfo.loc, skillInfo.w);
            }, delay);
        }
    };

    mod.game.on('enter_game', () => {
        loadItemsConfig(); 
        loadSkillsConfig(); 
        
        brooch.id = itemsConfig.activeBroochId;
        rootbeer.id = itemsConfig.activeRootbeerId;
        
        const currentClass = getCurrentClass();
        if (currentClass !== 'unknown') {
            updateOperationalSkillsConfig(currentClass); 
        } else if (debug) {
            mod.log('[Lazyrootbeer] enter_game: Class still unknown, skill config not updated yet.');
        }


        if (!brooch.id) { 
             mod.command.message('[Lazyrootbeer] Brooch ID not set. Use "/au learnbrooch" then "/au setbrooch <id>".'.clr('FFFF00'));
        }
        if(debug) mod.command.message(`[Lazyrootbeer] Entered game, class: ${currentClass}, skill settings potentially loaded.`);
    });
    
    mod.hook('S_LOGIN', mod.majorPatchVersion >= 108 ? 15 : 14, () => {
        const currentClass = getCurrentClass();
        if (currentClass !== 'unknown') {
            // Ensure configs are loaded before updating operational skills,
            // as S_LOGIN might fire before enter_game in some proxy setups or on quick relogs.
            loadItemsConfig(); // Might be redundant if enter_game always fires first, but safe.
            loadSkillsConfig();
            brooch.id = itemsConfig.activeBroochId;
            rootbeer.id = itemsConfig.activeRootbeerId;

            updateOperationalSkillsConfig(currentClass);
            if (debug) mod.log(`[Lazyrootbeer] S_LOGIN: Class identified as ${currentClass}, skill settings updated.`);
        }
    });


    const S_SHOW_ITEM_TOOLTIP_VERSION_TO_HOOK = 14; 
    mod.hook('S_SHOW_ITEM_TOOLTIP', S_SHOW_ITEM_TOOLTIP_VERSION_TO_HOOK, (event) => {
        if (!learnMode) return; 

        const itemId = event.id;
        if (!mod.game.data || !mod.game.data.items) {
            mod.command.message('[Lazyrootbeer] Game item data is not available for learning.'.clr('FF0000'));
            learnMode = null;
            return;
        }
        
        const itemData = mod.game.data.items.get(itemId);
        let itemName = itemData ? (itemData.name || 'Unknown Item') : 'Unknown Item (no data)';

        if (learnMode === 'brooch') {
            mod.command.message(`[Lazyrootbeer] Hovered Brooch?: ${itemName.clr('00FFFF')} (ID: ${itemId}). To set, type: "/au setbrooch ${itemId}"`.clr('FFFF00'));
            learnMode = null; 
        } else if (learnMode === 'rootbeer') {
            mod.command.message(`[Lazyrootbeer] Hovered Root Beer?: ${itemName.clr('00FFFF')} (ID: ${itemId}). To set, type: "/au setrootbeer ${itemId}"`.clr('FFFF00'));
            learnMode = null; 
        }
    });

    mod.hook('S_START_COOLTIME_ITEM', 1, {order: Number.NEGATIVE_INFINITY}, event => {
        if(!enabled) return;
        if(brooch.id && event.item === brooch.id) {
            brooch.cooldown = Date.now() + event.cooldown * 1000;
            if(debug) mod.command.message(`[Lazyrootbeer] Brooch (ID: ${brooch.id}) cooldown: ${event.cooldown}s`.clr('FFD700'));
        }
        else if(rootbeer.id && event.item === rootbeer.id) {
            rootbeer.cooldown = Date.now() + event.cooldown * 1000;
            if(debug) mod.command.message(`[Lazyrootbeer] Root Beer (ID: ${rootbeer.id}) cooldown: ${event.cooldown}s`.clr('FFD700'));
        }
    });

    mod.hook('C_START_SKILL', 7, {order: Number.NEGATIVE_INFINITY}, event => {
        const currentClass = getCurrentClass(); 
        if(debug && event && event.skill){ 
            mod.command.message(`[Lazyrootbeer Debug] Class: ${currentClass} | Skill ID: ${event.skill.id.toString().clr("00FF00")}`.clr("FFFF00"));
        }
        if(!enabled || !event || !event.skill || currentClass === 'unknown') return; 
        handle(event);
    });

    this.destructor = () => {
        mod.command.remove('au');
        saveItemsConfig();
        saveSkillsConfig();
        if (debug) mod.command.message('[Lazyrootbeer] Unloaded.'.clr('FF0000'));
    };
}
