const path = require("path")
const process = require("process")

const BASE_DIR = process.cwd()
const SRC_DIR = "src"
const BUILD_DIR = "build"
const EXPORT_DIR = "exports"
const CLASSES_DIR = path.join(EXPORT_DIR, "classes")
const LUA_DIR = path.join(BASE_DIR, BUILD_DIR, "lua")

const SPELL_ATTRIBUTES = {
  SPELL_ATTR0_DO_NOT_DISPLAY_SPELLBOOK_AURA_ICON_COMBAT_LOG: 8,
  SPELL_ATTR0_DO_NOT_LOG: 9,
}

/**
 * For some reason these are not excluded by any filters and I couldn't find a
 * way to exclude them. Please let me know if there's a better way.
 */
const SERVER_HIDDEN_SPELLS = {
  DRUID: [],
  HUNTER: [],
  MAGE: [
    12494, // Frostbite
    12355, // Impact,
    12484, // Chilled Rank 1
  ],
  PALADIN: [],
  PRIEST: [
    // 23455, // Holy Nova Rank 1
  ],
  ROGUE: [],
  SHAMAN: [],
  WARLOCK: [],
  WARRIOR: [],
}

module.exports = {
  BASE_DIR,
  SRC_DIR,
  BUILD_DIR,
  EXPORT_DIR,
  CLASSES_DIR,
  LUA_DIR,
  SPELL_ATTRIBUTES,
  SERVER_HIDDEN_SPELLS,
}
