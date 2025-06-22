# Lazyrootbeer

**Lazyrootbeer** is a TERA Toolbox module that automatically uses your **brooch** and a **chosen consumable** (like Root Beer) when specific skills are used. Configuration is per-class and dead simple thanks to hover-to-learn.

---

### ⚙️ Features

- 🔁 Auto-activates items when using chosen skills  
- 👤 Per-class configuration  
- 🖱️ Hover-based item setup (no typing IDs!)  
- ⏱️ Adjustable delay and combat-only toggle  

---

### 🚀 Quick Start

1. `/8 au learnbrooch` → Hover your **brooch** in inventory  
2. `/8 au learnrootbeer` → Hover your **consumable** (e.g. Root Beer)  
*Repeat step 1 to save multiple brooches*

---

### 💻 Commands

All commands start with `/8 au`.

---

#### 🔧 Core

| Command            | Description                          |
|--------------------|--------------------------------------|
| `on` / `off`       | Enables or disables the module       |
| `debug`            | Toggles debug mode (shows skill IDs) |
| `help`             | Shows a summary of available commands |

---

#### 🎒 Item Management

| Command                         | Description                               |
|----------------------------------|-------------------------------------------|
| `learnbrooch`                   | Hover a brooch to save it                 |
| `clearbrooch <itemId>`         | Remove a specific brooch by item ID       |
| `learnrootbeer`                | Hover a consumable to save it             |
| `clearrootbeer`                | Clears the saved consumable               |
| `checkitems`                   | Displays currently saved items            |

---

#### 🎯 Skill Configuration

| Command                              | Description                                |
|--------------------------------------|--------------------------------------------|
| `addbroochskill <skillId>`          | Adds a skill that triggers brooch usage    |
| `delbroochskill <skillId>`          | Removes a brooch-trigger skill             |
| `addrootskill <skillId>`            | Adds a skill that triggers consumable use  |
| `delrootskill <skillId>`            | Removes a consumable-trigger skill         |
| `showskills`                        | Lists configured skills for current class  |
| `togglecombat`                      | Toggle item usage outside of combat        |
| `setdelay <ms>`                     | Sets delay before using items (in ms)      |
