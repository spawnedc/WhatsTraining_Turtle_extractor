const { execSync } = require("child_process")
const { writeFileSync } = require("fs")
const path = require("path")
const getIdsFromMask = require("./utils/getIdsFromMask")
const {
  BASE_DIR,
  SRC_DIR,
  EXPORT_DIR,
  CLASSES_DIR,
  SPELL_ATTRIBUTES,
  SERVER_HIDDEN_SPELLS,
} = require("./constants")

const hiddenSpellAttributes = [
  SPELL_ATTRIBUTES.SPELL_ATTR0_DO_NOT_DISPLAY_SPELLBOOK_AURA_ICON_COMBAT_LOG,
  // SPELL_ATTRIBUTES.SPELL_ATTR0_DO_NOT_LOG,
]

const EXTRACT_DBC = process.argv[2] === "true"

execSync(`mkdir -p ${path.join(BASE_DIR, SRC_DIR, CLASSES_DIR)}`)

const arrayToObject = (array, keyField) =>
  array.reduce((obj, item) => {
    obj[item[keyField]] = item
    return obj
  }, {})

const extractFile = (dbName) => {
  const moduleFile = `${path.join(EXPORT_DIR, dbName)}.json`
  if (EXTRACT_DBC) {
    console.info("Extracting", dbName, "as", moduleFile, "...")
    execSync(
      `npm run start -- ${dbName} --file=${path.join(
        BASE_DIR,
        SRC_DIR,
        moduleFile
      )}`
    )
  }
  return `./${moduleFile}`
}

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

const allClasses = classes.map((cls) => ({
  name: cls.Name_Lang_enUS,
  fileName: cls.Filename,
  classSet: cls.SpellClassSet,
  classMask: Math.pow(2, cls.ID - 1),
}))

const allSpells = require(FILE_ALL_SPELLS)
const allSpellsById = arrayToObject(allSpells, "ID")

const spellIcons = require(FILE_SPELL_ICONS)
const spellIconsById = arrayToObject(spellIcons, "ID")

const skillLines = require(FILE_SKILL_LINES)
const skillLinesById = arrayToObject(skillLines, "ID")
const skillLineAbilities = require(FILE_SKILL_LINE_ABILITIES)
const skillLineAbilitiesBySpellId = arrayToObject(skillLineAbilities, "Spell")

const getSpellRanks = (spells, spellName) =>
  spells
    .filter((spl) => spl.name === spellName)
    .filter((spl) => !!spl.rank)
    .sort((a, b) => a.rank - b.rank)

const getRequiredIdForSpellId = (spellId, ranks) => {
  if (ranks.length <= 1) {
    return undefined
  }

  const spellRankIndex = ranks.findIndex((r) => r.id === spellId)

  if (spellRankIndex <= 0) {
    return undefined
  }

  return ranks[spellRankIndex - 1].id
}

const getSpellOverrides = (spells, spell) => {
  const spellsWithSameName = getSpellRanks(spells, spell.name)

  const spellIds = spellsWithSameName.map((s) => s.id)
  const slas = spellIds
    .map((spellId, index) => {
      const sla = skillLineAbilitiesBySpellId[spellId]
      if (index === 0 && sla?.SupercededBySpell) {
        return [spellId, sla.SupercededBySpell]
      }
      return sla?.SupercededBySpell
    })
    .flat()
    .filter((s) => s)

  return slas
}

allClasses.forEach((cls) => {
  console.info(`Exporting ${cls.fileName} spells...`)
  console.info(cls)

  const classSkillLines = skillRaceClassInfo
    .filter((srci) => srci.ClassMask === cls.classMask)
    // this... Do not display in skills (hidden client side)
    .filter((srci) => !getIdsFromMask(srci.Flags).includes(2))

  const classSkillLinesIds = classSkillLines
    .map((csl) => csl.SkillID)
    .filter(
      (skillId) => skillLinesById[skillId]?.CategoryID === 7 // Class Skills only
    )

  const classSkillLineAbilities = skillLineAbilities
    // Only include class skill lines
    .filter((sla) => classSkillLinesIds.includes(sla.SkillLine))
    // Only include class skill line abilities
    // Hopefully this will exclude spells like Clearcasting
    // .filter((sla) => sla.ClassMask === cls.classMask)
    // Exclude spells hidden by the server
    .filter((sla) => !SERVER_HIDDEN_SPELLS[cls.fileName].includes(sla.Spell))

  const classTalentTabsById = arrayToObject(talentTabs, "ID")

  const classTalentTabIds = talentTabs
    .filter((tt) => tt.ClassMask === cls.classMask)
    .map((tt) => tt.ID)
  const classTalents = talents.filter((t) =>
    classTalentTabIds.includes(t.TabID)
  )
  const classTalentSpells = classTalents
    .filter((t) => t.Flags === 1)
    .map((t) => ({
      id: t.ID,
      spell: t.SpellRank_1,
      level: 10 + t.TierID * 5,
      // Lua indexes start from 1 :sigh:
      tabIndex: classTalentTabsById[t.TabID].OrderIndex + 1,
    }))

  let hasRaceMask = false

  let overriddenSpellsMap = {}

  const allClassSpells = classSkillLineAbilities
    .map((sla) => {
      const spell = allSpellsById[sla.Spell]
      const spellAttributes =
        spell.Attributes !== 0 ? getIdsFromMask(spell.Attributes) : []
      if (
        hiddenSpellAttributes.some((hiddenSpellAttribute) =>
          spellAttributes.includes(hiddenSpellAttribute)
        )
      ) {
        return undefined
      }

      const races =
        sla.RaceMask !== 0
          ? getIdsFromMask(sla.RaceMask).map(
              // UnitRace("player") returns the name, not the ID
              (raceId) => racesById[raceId].Name_Lang_enUS
            )
          : undefined
      const isTaughtByTalent = classTalentSpells.find(
        (cts) => cts.spell === spell.ID
      )

      hasRaceMask = hasRaceMask || !!races

      const rank = spell.NameSubtext_Lang_enUS
        ? parseInt(spell.NameSubtext_Lang_enUS.replace("Rank ", ""), 10)
        : 0
      const newSpell = {
        id: spell.ID,
        name: spell.Name_Lang_enUS,
        subText: spell.NameSubtext_Lang_enUS,
        rank,
        level: isTaughtByTalent?.level || spell.BaseLevel,
        icon: spellIconsById[spell.SpellIconID].TextureFilename,
        races: races?.length > 0 ? races : undefined,
        requiredTalent: isTaughtByTalent
          ? { id: isTaughtByTalent.id, tabIndex: isTaughtByTalent.tabIndex }
          : undefined,
      }

      return newSpell
    })
    .filter((spell) => spell)
    .filter((spell) => spell.level > 0)

  allClassSpells.forEach((spell) => {
    const sla = skillLineAbilitiesBySpellId[spell.id]
    if (sla?.SupercededBySpell) {
      const overrideIds = getSpellOverrides(allClassSpells, spell)
      if (overrideIds.length > 1) {
        overriddenSpellsMap = overrideIds.reduce((acc, overrideId, index) => {
          if (index === 0) {
            return acc
          }
          return {
            ...acc,
            [overrideId]: [...overrideIds].slice(0, index),
          }
        }, overriddenSpellsMap)
      }
    }
  })

  const classSpells = allClassSpells
    .map((spell) => {
      const ranks = getSpellRanks(allClassSpells, spell.name)
      const requiredId = getRequiredIdForSpellId(spell.id, ranks)
      const spellCopy = { ...spell }

      if (requiredId) {
        spellCopy.requiredIds = [requiredId]
      }

      // Exclude the spells that has ranks but no rank text, and doesn't have a complete set of ranks
      const hasRanks = ranks.length > 0
      const lastRank = ranks[ranks.length - 1]
      const allRanksExist = hasRanks ? lastRank.rank === ranks.length : true
      const hasItselfAsRank = ranks.map((s) => s.id).includes(spellCopy.id)
      const excludeDueToRanks = hasRanks && (!hasItselfAsRank || !allRanksExist)

      const isTriggeredSpell = allSpells.find((spl) => {
        const triggers = [
          spl.EffectTriggerSpell1,
          spl.EffectTriggerSpell2,
          spl.EffectTriggerSpell3,
        ]
        return triggers.includes(spell.id)
      })

      const excludedDueToTriggeringSpell =
        isTriggeredSpell &&
        getIdsFromMask(isTriggeredSpell.Attributes).includes(
          SPELL_ATTRIBUTES.SPELL_ATTR0_DO_NOT_DISPLAY_SPELLBOOK_AURA_ICON_COMBAT_LOG
        )

      spellCopy.shouldBeExcluded =
        excludeDueToRanks || excludedDueToTriggeringSpell

      return spellCopy
    })
    .filter((cs) => !cs.shouldBeExcluded)
    .map((s) => {
      const { shouldBeExcluded, rank, ...spl } = s
      return spl
    })

  classSpells.sort((a, b) => a.name.localeCompare(b.name))

  const spellsByLevel = Object.groupBy(classSpells, ({ level }) => level)

  const classData = {
    fileName: cls.fileName,
    hasRaceMask,
    overriddenSpellsMap,
    spellsByLevel,
  }

  writeFileSync(
    path.join(BASE_DIR, SRC_DIR, CLASSES_DIR, `${cls.fileName}.json`),
    JSON.stringify(classData, undefined, 2)
  )
})
