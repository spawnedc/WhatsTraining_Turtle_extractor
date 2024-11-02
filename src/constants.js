const path = require("path");
const process = require("process");

const BASE_DIR = process.cwd();
const SRC_DIR = "src";
const BUILD_DIR = "build";
const EXPORT_DIR = "exports";
const CLASSES_DIR = path.join(EXPORT_DIR, "classes");
const LUA_DIR = path.join(BASE_DIR, BUILD_DIR, "lua");

const SPELL_ATTRIBUTES = {
  SPELL_ATTR0_DO_NOT_DISPLAY_SPELLBOOK_AURA_ICON_COMBAT_LOG: 8,
  SPELL_ATTR0_DO_NOT_LOG: 9,
};

/**
 * For some reason these are not excluded by any filters and I couldn't find a
 * way to exclude them. Please let me know if there's a better way.
 */
const SERVER_HIDDEN_SPELLS = [
  12494, // Mage: Frostbite
  12355, // Mage: Impact,
  23455, // Priest: Holy Nova Rank 1
  23458, // Priest: Holy Nova Rank 2
  23459, // Priest: Holy Nova Rank 3
  27803, // Priest: Holy Nova Rank 4
  27804, // Priest: Holy Nova Rank 5
  27805, // Priest: Holy Nova Rank 6
];

module.exports = {
  BASE_DIR,
  SRC_DIR,
  BUILD_DIR,
  EXPORT_DIR,
  CLASSES_DIR,
  LUA_DIR,
  SPELL_ATTRIBUTES,
  SERVER_HIDDEN_SPELLS,
};
