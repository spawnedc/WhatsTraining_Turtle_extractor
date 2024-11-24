const { execSync } = require("child_process")
const path = require("path")
const arrayToObject = require("./arrayToObject")
const { BASE_DIR, SRC_DIR, EXPORT_DIR, CLASSES_DIR } = require("../constants")

const getInitialData = (extractDbc) => {
  const extractFile = (dbName) => {
    const moduleFile = `${path.join(EXPORT_DIR, dbName)}.json`
    if (extractDbc) {
      console.info("Extracting", dbName, "as", moduleFile, "...")
      execSync(
        `npm run start -- ${dbName} --file=${path.join(
          BASE_DIR,
          SRC_DIR,
          moduleFile
        )}`
      )
    }
    const moduleRealPath = path.join(BASE_DIR, SRC_DIR, moduleFile)
    return path.relative(__dirname, moduleRealPath)
  }

  execSync(`mkdir -p ${path.join(BASE_DIR, SRC_DIR, CLASSES_DIR)}`)

  const FILE_SKILL_RACE_CLASS_INFO = extractFile("SkillRaceClassInfo")
  const FILE_CLASSES = extractFile("ChrClasses")
  const FILE_RACES = extractFile("ChrRaces")
  const FILE_ALL_SPELLS = extractFile("Spell")
  const FILE_SKILL_LINES = extractFile("SkillLine")
  const FILE_SKILL_LINE_ABILITIES = extractFile("SkillLineAbility")
  const FILE_SPELL_ICONS = extractFile("SpellIcon")
  const FILE_TALENT_TABS = extractFile("TalentTab")
  const FILE_TALENTS = extractFile("Talent")

  const skillRaceClassInfo = require(FILE_SKILL_RACE_CLASS_INFO)
  const talentTabs = require(FILE_TALENT_TABS)
  const talents = require(FILE_TALENTS)
  const classes = require(FILE_CLASSES)
  const races = require(FILE_RACES)
  const racesById = arrayToObject(races, "ID")

  const allSpells = require(FILE_ALL_SPELLS)
  const allSpellsById = arrayToObject(allSpells, "ID")

  const spellIcons = require(FILE_SPELL_ICONS)
  const spellIconsById = arrayToObject(spellIcons, "ID")

  const skillLines = require(FILE_SKILL_LINES)
  const skillLinesById = arrayToObject(skillLines, "ID")
  const skillLineAbilities = require(FILE_SKILL_LINE_ABILITIES)
  const skillLineAbilitiesBySpellId = arrayToObject(skillLineAbilities, "Spell")

  return {
    skillRaceClassInfo,
    talentTabs,
    talents,
    classes,
    races,
    racesById,
    allSpells,
    allSpellsById,
    spellIcons,
    spellIconsById,
    skillLines,
    skillLinesById,
    skillLineAbilities,
    skillLineAbilitiesBySpellId,
  }
}

module.exports = getInitialData
