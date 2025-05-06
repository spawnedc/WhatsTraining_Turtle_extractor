import { join } from "path"
import { cwd } from "process"

const BASE_DIR = cwd()
const SRC_DIR = "src"
const BUILD_DIR = "build"
const EXPORT_DIR = join(BASE_DIR, "exports")
const DBC_DIR = join(EXPORT_DIR, "dbc")
const JSON_DIR = join(EXPORT_DIR, "json")
const CLASSES_DIR = join(EXPORT_DIR, "classes")
const LUA_DIR = join(BASE_DIR, BUILD_DIR, "lua")

const SPELL_ATTRIBUTES = {
  SPELL_ATTR0_DO_NOT_DISPLAY_SPELLBOOK_AURA_ICON_COMBAT_LOG: 8,
  SPELL_ATTR0_DO_NOT_LOG: 9,
}

const SPELL_EFFECTS = {
  SPELL_EFFECT_LEARN_SPELL: 36,
}

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
  20187, // Paladin: Judgement of Righteousness Rank 1
  20280, // Paladin: Judgement of Righteousness Rank 2
  20281, // Paladin: Judgement of Righteousness Rank 3
  20282, // Paladin: Judgement of Righteousness Rank 4
  20283, // Paladin: Judgement of Righteousness Rank 5
  20284, // Paladin: Judgement of Righteousness Rank 6
  20285, // Paladin: Judgement of Righteousness Rank 7
  20286, // Paladin: Judgement of Righteousness Rank 8
  21084, // Paladin: Seal of Righteousness
]

export {
  BASE_DIR,
  DBC_DIR,
  JSON_DIR,
  SRC_DIR,
  BUILD_DIR,
  EXPORT_DIR,
  CLASSES_DIR,
  LUA_DIR,
  SPELL_ATTRIBUTES,
  SERVER_HIDDEN_SPELLS,
  SPELL_EFFECTS,
}
