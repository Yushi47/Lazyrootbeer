String.prototype.clr = function (hexColor) { return `<font color="#${hexColor}">${this}</font>` }

const fs = require('fs');
const path =require('path');

const ITEMS_CONFIG_PATH = path.join(__dirname, 'items.json');
const SKILLS_CONFIG_PATH = path.join(__dirname, 'skills.json'); 

module.exports = function Lazyrootbeer(mod){

    mod.game.initialize('inventory');

    let itemsConfig = { broochIds: [], rootbeerId: null };
    let skillsConfig = {}; 

    // ---- Configuration Loading/Saving ----

    function saveItemsConfig() {
        try {
            fs.writeFileSync(ITEMS_CONFIG_PATH, JSON.stringify(itemsConfig, null, 2));
        } catch (error) {
            mod.error('[Lazyrootbeer] Error saving items.json: ' + error);
        }
    }
    
    function loadItemsConfig() {
        try {
            if (fs.existsSync(ITEMS_CONFIG_PATH)) {
                const rawData = fs.readFileSync(ITEMS_CONFIG_PATH);
                const loadedConfig = JSON.parse(rawData);
    
                itemsConfig.broochIds = loadedConfig.broochIds || [];
                itemsConfig.rootbeerId = loadedConfig.rootbeerId !== undefined ? loadedConfig.rootbeerId : null;

            } else {
                mod.log('[Lazyrootbeer] items.json not found. Creating a new one.');
                saveItemsConfig(); // Create file with default empty config
            }
        } catch (error) {
            mod.error('[Lazyrootbeer] Error loading items.json: ' + error);
            itemsConfig = { broochIds: [], rootbeerId: null };
        }
    }

    function loadSkillsConfig() {
        try {
            if (fs.existsSync(SKILLS_CONFIG_PATH)) {
                skillsConfig = JSON.parse(fs.readFileSync(SKILLS_CONFIG_PATH, 'utf8')); 
            } else {
                skillsConfig = {}; 
                mod.log('[Lazyrootbeer] skills.json not found. Using empty skill config.');
            }
        } catch (error) {
            mod.error('[Lazyrootbeer] Error loading skills.json: ' + error);
            skillsConfig = {}; 
        }
    }

    function saveSkillsConfig() {
        try {
            fs.writeFileSync(SKILLS_CONFIG_PATH, JSON.stringify(skillsConfig, null, 2), 'utf8');
        } catch (error) {
            mod.error('[Lazyrootbeer] Error saving skills.json: ' + error);
        }
    }
    
    loadItemsConfig();
    loadSkillsConfig();

    // ---- Core Variables & Logic ----

    let enabled = true,
        debug = false,
        learnMode = null, 
        activeBrooch = { id : null, cooldown : 0 },
        activeRootbeer = { id : null, cooldown : 0 },
        useBroochOn = [],
        useRootBeerOn = [],
        useOutOfCombat = false,
        delay = 0;

    mod.log(`[Lazyrootbeer] Brooch & Root Beer lists loaded.`);

    function validateActiveItems() {
        activeBrooch.id = mod.game.inventory.findInEquipment(itemsConfig.broochIds)?.id || null;
        activeRootbeer.id = itemsConfig.rootbeerId ? (mod.game.inventory.find(itemsConfig.rootbeerId)?.id || null) : null;
    }

    function useItem(itemId, loc, w) {
        if (!itemId) return;
        mod.send('C_USE_ITEM', 3, {
            gameId: mod.game.me.gameId,
            id: itemId,
            dbid: 0, target: 0, amount: 1,
            dest: { x: 0, y: 0, z: 0 },
            loc: loc, w: w,
            unk1: 0, unk2: 0, unk3: 0, unk4: true
        });
        if(debug) mod.command.message(`[Lazyrootbeer] Used item: ${itemId}`.clr('00FF00'));
    }

    // Refactored item trigger logic
    function tryUseItem(item, skillList, skillInfo) {
        if (item.id && skillList.includes(skillInfo.skill.id) && Date.now() > item.cooldown) {
            const trigger = () => { if (enabled && item.id) useItem(item.id, skillInfo.loc, skillInfo.w); };
            
            if (delay > 0) setTimeout(trigger, delay);
            else trigger();
        }
    }

    // Main event handler
    const handle = (skillInfo) => {
        if(!enabled || (!useOutOfCombat && !mod.game.me.inCombat) || mod.game.me.inBattleground) return;
        tryUseItem(activeBrooch, useBroochOn, skillInfo);
        tryUseItem(activeRootbeer, useRootBeerOn, skillInfo);
    };

    // ---- Character & Class Management ----
    
    function getCurrentClass() {
        return mod.game.me.class || 'unknown';
    }
    
    function ensureClassConfig(className) {
        if (!skillsConfig[className]) {
            skillsConfig[className] = { useBroochOn: [], useRootBeerOn: [], useOutOfCombat: false, delay: 0 };
            mod.log(`[Lazyrootbeer] Initialized default skill config for class: ${className}`);
        }
        return skillsConfig[className];
    }
    
    function updateOperationalSkillsConfig(className) {
        if (className === 'unknown') return;
        const classCfg = ensureClassConfig(className);
        useBroochOn = classCfg.useBroochOn;
        useRootBeerOn = classCfg.useRootBeerOn;
        useOutOfCombat = classCfg.useOutOfCombat;
        delay = classCfg.delay;
    }

    // Refactored skill management for commands
    function manageSkill(action, itemType, skillId, classCfg) {
        const list = (itemType === 'brooch') ? classCfg.useBroochOn : classCfg.useRootBeerOn;
        const skillName = (itemType === 'brooch') ? 'Brooch' : 'Root Beer';
        const index = list.indexOf(skillId);

        if (action === 'add') {
            if (index === -1) {
                list.push(skillId);
                mod.command.message(`Skill ${skillId} added to ${skillName} list for ${classCfg.name}.`.clr('00FF00'));
                return true;
            }
            mod.command.message(`Skill ${skillId} already in ${skillName} list for ${classCfg.name}.`.clr('FFFF00'));
        } else if (action === 'remove') {
            if (index > -1) {
                list.splice(index, 1);
                mod.command.message(`Skill ${skillId} removed from ${skillName} list for ${classCfg.name}.`.clr('00FF00'));
                return true;
            }
            mod.command.message(`Skill ${skillId} not found in ${skillName} list for ${classCfg.name}.`.clr('FF0000'));
        }
        return false;
    }

    // ---- Commands ----

    mod.command.add('au', (arg, arg2) => {
        if(!arg){
            mod.command.message('[Lazyrootbeer] See /au help for commands.'.clr('FFFFFF'));
            return;
        }
        arg = arg.toLowerCase();
        const currentClass = getCurrentClass();

        if (currentClass === 'unknown' && !['on', 'off', 'debug', 'help'].includes(arg)) {
            mod.command.message('[Lazyrootbeer] Character not fully loaded. Please try again shortly.'.clr('FF0000'));
            return;
        }
        let classCfg = ensureClassConfig(currentClass); 
        classCfg.name = currentClass; // Attach name for logging

        const skillId = parseInt(arg2);
        let configChanged = false;

        switch(arg) {
            case 'on': enabled = true; mod.command.message('[Lazyrootbeer] Enabled.'.clr('00FF33')); break;
            case 'off': enabled = false; mod.command.message('[Lazyrootbeer] Disabled.'.clr('FF0000')); break;
            case 'debug': debug = !debug; mod.command.message(`[Lazyrootbeer] Debug Status : ${debug}`); break;
            
            // Auto-learn commands
            case 'learnbrooch': learnMode = 'brooch'; mod.command.message('[Lazyrootbeer] Learn Brooch: Hover over a brooch in your inventory.'.clr('FFFF00')); break;
            case 'learnrootbeer': learnMode = 'rootbeer'; mod.command.message('[Lazyrootbeer] Learn Root Beer: Hover over a consumable in your inventory.'.clr('FFFF00')); break;
            
            // Clear commands
            case 'clearbrooch':
                if (arg2 && !isNaN(skillId)) {
                    const index = itemsConfig.broochIds.indexOf(skillId);
                    if (index > -1) {
                        itemsConfig.broochIds.splice(index, 1);
                        saveItemsConfig();
                        mod.command.message(`[Lazyrootbeer] Brooch ID ${skillId} removed.`.clr('FFA500'));
                        validateActiveItems();
                    } else mod.command.message(`[Lazyrootbeer] Brooch ID ${skillId} not found.`.clr('FF0000'));
                } else mod.command.message('Usage: /au clearbrooch <itemID>'.clr('FF0000'));
                break;
            case 'clearrootbeer':
                itemsConfig.rootbeerId = null;
                saveItemsConfig();
                mod.command.message(`[Lazyrootbeer] Root Beer ID cleared.`.clr('FFA500'));
                validateActiveItems();
                break;

            case 'checkitems': 
                mod.command.message(`[Lazyrootbeer] Master Brooch List: ${itemsConfig.broochIds.join(', ') || 'None'}`.clr('00FFFF'));
                mod.command.message(`--> Active Brooch: ${activeBrooch.id || 'None detected'}`.clr('FFFFFF'));
                mod.command.message(`[Lazyrootbeer] Configured Root Beer: ${itemsConfig.rootbeerId || 'None'}`.clr('00FFFF'));
                mod.command.message(`--> Active Root Beer: ${activeRootbeer.id || 'None detected'}`.clr('FFFFFF'));
                break;

            // Skill management commands
            case 'addbroochskill': configChanged = arg2 && !isNaN(skillId) && manageSkill('add', 'brooch', skillId, classCfg); break;
            case 'delbroochskill': configChanged = arg2 && !isNaN(skillId) && manageSkill('remove', 'brooch', skillId, classCfg); break;
            case 'addrootskill':   configChanged = arg2 && !isNaN(skillId) && manageSkill('add', 'rootbeer', skillId, classCfg); break;
            case 'delrootskill':   configChanged = arg2 && !isNaN(skillId) && manageSkill('remove', 'rootbeer', skillId, classCfg); break;
            
            case 'togglecombat':
                classCfg.useOutOfCombat = !classCfg.useOutOfCombat;
                configChanged = true;
                mod.command.message(`'Use Out of Combat' for ${currentClass} set to: ${classCfg.useOutOfCombat}.`.clr('00FFFF'));
                break;
            case 'setdelay':
                const newDelay = parseInt(arg2);
                if (arg2 && !isNaN(newDelay) && newDelay >= 0) {
                    classCfg.delay = newDelay;
                    configChanged = true;
                    mod.command.message(`Delay for ${currentClass} set to: ${classCfg.delay}ms.`.clr('00FFFF'));
                } else mod.command.message('Delay must be a non-negative number.'.clr('FF0000'));
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
                mod.command.message('/au learnbrooch | clearbrooch <id>'.clr('FFFFFF'));
                mod.command.message('/au learnrootbeer | clearrootbeer'.clr('FFFFFF'));
                mod.command.message('/au addbroochskill <id> | delbroochskill <id>'.clr('FFFFFF'));
                mod.command.message('/au addrootskill <id> | delrootskill <id>'.clr('FFFFFF'));
                mod.command.message('/au togglecombat | setdelay <ms> | showskills'.clr('FFFFFF'));
                mod.command.message('/au checkitems'.clr('FFFFFF'));
                break;
            default:
                mod.command.message(`[Lazyrootbeer] Unknown command: ${arg}. See /au help.`.clr('FF0000'));
        }

        if (configChanged) {
            saveSkillsConfig();
            updateOperationalSkillsConfig(currentClass);
        }
    });

    // ---- Hooks ----

    mod.game.on('enter_game', () => {
        loadItemsConfig(); 
        loadSkillsConfig(); 
        updateOperationalSkillsConfig(getCurrentClass()); 
        setTimeout(validateActiveItems, 2000);
    });
    
    mod.hook('S_LOGIN', mod.majorPatchVersion >= 108 ? 15 : 14, () => {
        const currentClass = getCurrentClass();
        loadItemsConfig();
        loadSkillsConfig();
        updateOperationalSkillsConfig(currentClass);
        setTimeout(validateActiveItems, 2000);
    });

    mod.hook('S_SHOW_ITEM_TOOLTIP', 14, (event) => {
        if (!learnMode) return;

        const itemId = event.id;
        const itemName = mod.game.data.items.get(itemId)?.name || 'Unknown Item';

        if (learnMode === 'brooch') {
            if (!itemsConfig.broochIds.includes(itemId)) {
                itemsConfig.broochIds.push(itemId);
                mod.command.message(`[Lazyrootbeer] Brooch Saved: ${itemName.clr('00FFFF')} (ID: ${itemId})`.clr('00FF00'));
            } else {
                mod.command.message(`[Lazyrootbeer] Brooch Already in List: ${itemName.clr('00FFFF')} (ID: ${itemId})`.clr('FFFF00'));
            }
        } else if (learnMode === 'rootbeer') {
            itemsConfig.rootbeerId = itemId;
            mod.command.message(`[Lazyrootbeer] Root Beer Saved: ${itemName.clr('00FFFF')} (ID: ${itemId})`.clr('00FF00'));
        }
        
        saveItemsConfig();
        validateActiveItems();
        learnMode = null; 
    });

    mod.hook('S_START_COOLTIME_ITEM', 1, event => {
        if(!enabled) return;
        if(activeBrooch.id && event.item === activeBrooch.id) {
            activeBrooch.cooldown = Date.now() + event.cooldown * 1000;
        }
        else if(activeRootbeer.id && event.item === activeRootbeer.id) {
            activeRootbeer.cooldown = Date.now() + event.cooldown * 1000;
        }
    });

    mod.hook('C_START_SKILL', 7, {order: Number.NEGATIVE_INFINITY}, event => {
        const currentClass = getCurrentClass(); 
        if(debug && event?.skill){ 
            mod.command.message(`[Debug] Class: ${currentClass} | Skill: ${event.skill.id}`.clr("FFFF00"));
        }
        if(!enabled || !event?.skill || currentClass === 'unknown') return; 
        handle(event);
    });

    this.destructor = () => {
        mod.command.remove('au');
        saveItemsConfig();
        saveSkillsConfig();
    };
}