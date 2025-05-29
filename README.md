# Lazyrootbeer - Auto Brooch & Root Beer

Automatically uses your configured brooch and root beer with specific skills for your character's class. All configurations are saved.

---

## 🛠 Initial Setup

*(One-time or when changing items)*

### 🔷 Brooch ID Configuration

1. Use `/8 au learnbrooch` then hover over your brooch in your profile/inventory. The game chat will show the detected item ID.
2. Set it with `/8 au setbrooch <itemID>`
   Example: `/8 au setbrooch 12345`
   This ID is saved.
3. To clear the saved brooch ID:
   `/8 au clearbrooch`

### 🟤 Root Beer ID Configuration

* Default Root Beer ID: `80081`
* To use a different Root Beer (or other consumable):

  1. Use `/8 au learnrootbeer`, then hover over the item.
  2. Set it with `/8 au setrootbeer <itemID>`
     This ID is saved.
  3. To reset to the default Root Beer ID:
     `/8 au clearrootbeer`

---

## ⚙️ Skill Configuration *(Per Class)*

Changes are saved to `skills.js`.

### ➕➖ Adding/Removing Trigger Skills

* Add skill to trigger **brooch**:
  `/8 au addbroochskill <skillId>`
* Remove skill from brooch trigger list:
  `/8 au delbroochskill <skillId>`
* Add skill to trigger **root beer**:
  `/8 au addrootskill <skillId>`
* Remove skill from root beer trigger list:
  `/8 au delrootskill <skillId>`

### ⚙️ Other Class-Specific Settings

* Toggle use outside combat:
  `/8 au togglecombat`
* Set delay after trigger (in ms):
  `/8 au setdelay <ms>`
  Example: `100` for 0.1 seconds
* Show current skill triggers and settings:
  `/8 au showskills`

---

## 🔍 Finding Skill IDs

1. Enable debug mode:
   `/8 au debug`
2. Use the desired skill in-game. The skill ID and class will appear in chat.

---

## 📜 General Commands

* Enable the module:
  `/8 au on`
* Disable the module:
  `/8 au off`
* Toggle debug messages (incl. skill ID logging):
  `/8 au debug`
* Show active item IDs:
  `/8 au checkitems`
* Show command summary:
  `/8 au help`

---

## 📝 Notes

* All item ID and skill configurations are saved and persist across sessions.
* Skill configurations are class-specific.
* Use `/8 au off` when not playing a class/role that benefits from auto item usage.

---