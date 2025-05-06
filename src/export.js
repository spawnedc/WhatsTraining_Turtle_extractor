import { execSync } from "child_process"
import { mkdirSync, existsSync, writeFileSync } from "fs"
import { join } from "path"
import getIdsFromMask from "./utils/getIdsFromMask.js"
import {
  CLASSES_DIR,
  SPELL_ATTRIBUTES,
  SERVER_HIDDEN_SPELLS,
  SPELL_EFFECTS,
  DBC_DIR,
  JSON_DIR,
} from "./constants.js"
import convertDbcToJson from "./tools/extractJsonFromDbc/index.js"
import arrayToObject from "./utils/arrayToObject.js"

const hiddenSpellAttributes = [
  SPELL_ATTRIBUTES.SPELL_ATTR0_DO_NOT_DISPLAY_SPELLBOOK_AURA_ICON_COMBAT_LOG,
]

const excludedSpellEffects = [SPELL_EFFECTS.SPELL_EFFECT_LEARN_SPELL]

const EXTRACT_DBC = process.argv[2] === "true"

const extractClassData = async () => {
  execSync(`mkdir -p ${CLASSES_DIR}`)

  const extractFile = async (dbName) => {
    const moduleFile = `${join(JSON_DIR, dbName)}.json`
    if (!existsSync(moduleFile) || EXTRACT_DBC) {
      console.info("Extracting", dbName, "as", moduleFile, "...")

      await convertDbcToJson([dbName], {
        dbcPath: DBC_DIR,
        outDir: JSON_DIR,
      })
    }
    return moduleFile
  }

  const FILE_SKILL_RACE_CLASS_INFO = await extractFile("SkillRaceClassInfo")
  const FILE_CLASSES = await extractFile("ChrClasses")
  const FILE_RACES = await extractFile("ChrRaces")
  const FILE_ALL_SPELLS = await extractFile("Spell")
  const FILE_SKILL_LINES = await extractFile("SkillLine")
  const FILE_SKILL_LINE_ABILITIES = await extractFile("SkillLineAbility")
  const FILE_SPELL_ICONS = await extractFile("SpellIcon")
  const FILE_TALENT_TABS = await extractFile("TalentTab")
  const FILE_TALENTS = await extractFile("Talent")

  const { default: skillRaceClassInfo } = await import(
    FILE_SKILL_RACE_CLASS_INFO,
    { with: { type: "json" } }
  )
  const { default: talentTabs } = await import(FILE_TALENT_TABS, {
    with: { type: "json" },
  })
  const { default: talents } = await import(FILE_TALENTS, {
    with: { type: "json" },
  })
  const { default: classes } = await import(FILE_CLASSES, {
    with: { type: "json" },
  })
  const { default: races } = await import(FILE_RACES, {
    with: { type: "json" },
  })

  const racesById = arrayToObject(races, "ID")

  const allClasses = classes.map((cls) => ({
    name: cls.Name,
    fileName: cls.FileName,
    classSet: cls.SpellClassSet,
    classMask: Math.pow(2, cls.ID - 1),
  }))

  const { default: allSpells } = await import(FILE_ALL_SPELLS, {
    with: { type: "json" },
  })
  const allSpellsById = arrayToObject(allSpells, "ID")

  const { default: spellIcons } = await import(FILE_SPELL_ICONS, {
    with: { type: "json" },
  })
  const spellIconsById = arrayToObject(spellIcons, "ID")

  const { default: skillLines } = await import(FILE_SKILL_LINES, {
    with: { type: "json" },
  })
  const skillLinesById = arrayToObject(skillLines, "ID")
  const { default: skillLineAbilities } = await import(
    FILE_SKILL_LINE_ABILITIES,
    { with: { type: "json" } }
  )
  const skillLineAbilitiesBySpellId = arrayToObject(skillLineAbilities, "Spell")

  const getSpellRanks = (spells, spellName, nameField, subTextField) =>
    spells
      .filter((spl) => spl[nameField] === spellName)
      .filter((spl) => !!spl[subTextField])
      .sort((a, b) => a[subTextField].localeCompare(b[subTextField]))

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
    const spellsWithSameName = getSpellRanks(
      spells,
      spell.name,
      "name",
      "subText"
    )

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

    const classSkillLines = skillRaceClassInfo
      .filter((srci) => srci.ClassMask === cls.classMask)
      // this...
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
      .filter((sla) => sla.ClassMask === cls.classMask)
      // Exclude spells hidden by the server
      .filter((sla) => !SERVER_HIDDEN_SPELLS.includes(sla.Spell))

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
        if (!spell) {
          return undefined
        }
        if (spell.Name.startsWith("[Deprecated]")) {
          return undefined
        }
        if (
          excludedSpellEffects.includes(spell.Effect_1) ||
          excludedSpellEffects.includes(spell.Effect_2) ||
          excludedSpellEffects.includes(spell.Effect_3)
        ) {
          return undefined
        }
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
                (raceId) => racesById[raceId].Name
              )
            : undefined
        const isTaughtByTalent = classTalentSpells.find(
          (cts) => cts.spell === spell.ID
        )

        hasRaceMask = hasRaceMask || !!races

        const skillLine = skillLinesById[sla.SkillLine]

        const newSpell = {
          id: spell.ID,
          name: spell.Name,
          subText: spell.NameSubtext,
          level: isTaughtByTalent?.level || spell.BaseLevel,
          icon: spellIconsById[spell.SpellIconID].TextureFilename,
          races: races?.length > 0 ? races : undefined,
          requiredTalent: isTaughtByTalent
            ? { id: isTaughtByTalent.id, tabIndex: isTaughtByTalent.tabIndex }
            : undefined,
          school: skillLine.DisplayName,
        }

        return newSpell
      })
      .filter((spell) => spell)
      .filter((spell) => spell.level > 0)

    const classSpells = allClassSpells
      .map((spell) => {
        const ranks = getSpellRanks(
          allClassSpells,
          spell.name,
          "name",
          "subText"
        )
        const requiredId = getRequiredIdForSpellId(spell.id, ranks)
        const spellCopy = { ...spell }

        if (requiredId) {
          spellCopy.requiredIds = [requiredId]
        }

        // Exclude the spells that has ranks but no rank text
        const hasRanks = ranks.length > 0
        const hasItselfAsRank = ranks.map((s) => s.id).includes(spellCopy.id)
        spellCopy.shouldBeExcluded = hasRanks && !hasItselfAsRank

        return spellCopy
      })
      .filter((cs) => !cs.shouldBeExcluded)
      .map((s) => {
        const { shouldBeExcluded, ...spl } = s
        return spl
      })

    classSpells.forEach((spell) => {
      const sla = skillLineAbilitiesBySpellId[spell.id]
      if (sla?.SupercededBySpell) {
        const overrideIds = getSpellOverrides(classSpells, spell)
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

    const spellsByLevel = Object.groupBy(classSpells, ({ level }) => level)

    const classData = {
      fileName: cls.fileName,
      hasRaceMask,
      overriddenSpellsMap,
      spellsByLevel,
    }

    if (!existsSync(CLASSES_DIR)) {
      mkdirSync(CLASSES_DIR, { recursive: true })
    }

    writeFileSync(
      join(CLASSES_DIR, `${cls.fileName}.json`),
      JSON.stringify(classData, undefined, 2)
    )
  })
}

export default extractClassData
