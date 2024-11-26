const { writeFileSync } = require("fs")
const { Command } = require("commander")
const command = new Command()
const path = require("path")
const getIdsFromMask = require("./utils/getIdsFromMask")
const arrayToObject = require("./utils/arrayToObject")
const {
  BASE_DIR,
  SRC_DIR,
  CLASSES_DIR,
  SPELL_ATTRIBUTES,
  SERVER_HIDDEN_SPELLS,
} = require("./constants")
const getInitialData = require("./utils/getInitialData")
const logEmojiStatus = require("./utils/logEmojiStatus")

const hiddenSpellAttributes = [
  SPELL_ATTRIBUTES.SPELL_ATTR0_DO_NOT_DISPLAY_SPELLBOOK_AURA_ICON_COMBAT_LOG,
  // SPELL_ATTRIBUTES.SPELL_ATTR0_DO_NOT_LOG,
]

const getSpellRanks = (spells, spellName, includeNonRanks = false) =>
  spells
    .filter((spl) => spl.name === spellName)
    .filter((spl) => (includeNonRanks ? true : !!spl.rank))
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

const start = (classNames, extractDbc) => {
  const {
    skillRaceClassInfo,
    talentTabs,
    talents,
    classes,
    // races,
    racesById,
    allSpells,
    allSpellsById,
    // spellIcons,
    spellIconsById,
    // skillLines,
    skillLinesById,
    skillLineAbilities,
    skillLineAbilitiesBySpellId,
  } = getInitialData(extractDbc)

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

  const filteredClasses = classNames
    ? classes.filter((cls) => classNames.includes(cls.Filename.toLowerCase()))
    : classes

  const allClasses = filteredClasses.map((cls) => ({
    name: cls.Name_Lang_enUS,
    fileName: cls.Filename,
    classSet: cls.SpellClassSet,
    classMask: Math.pow(2, cls.ID - 1),
  }))

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
          school: skillLinesById[sla.SkillLine].DisplayName_Lang_enUS,
          requiredTalent: isTaughtByTalent
            ? { id: isTaughtByTalent.id, tabIndex: isTaughtByTalent.tabIndex }
            : undefined,
        }

        return newSpell
      })
      .filter((spell) => spell)
      .filter((spell) => spell.level > 0)
      .filter((spell) => !spell.name.startsWith("[Deprecated]"))
      .filter((spell) => !spell.name.startsWith("zzz"))

    const groupedSpells = Object.groupBy(allClassSpells, (s) => s.name)

    writeFileSync(
      path.join(
        BASE_DIR,
        SRC_DIR,
        CLASSES_DIR,
        `${cls.fileName}-by-spell.json`
      ),
      JSON.stringify(groupedSpells, undefined, 2)
    )

    const cleanGroupedSpells = {}

    Object.entries(groupedSpells).forEach(([spellName, ranks]) => {
      const sortedRanks = [...ranks]
      sortedRanks.sort((a, b) => a.rank - b.rank)

      const rankNums = sortedRanks.map((r) => r.rank)
      // Let's see if there are duplicate ranks
      const uniqueRanks = Array.from(new Set(rankNums))
      const hasDuplicateRanks = uniqueRanks.length !== ranks.length

      // Check if we have a mix of ranks and non-ranks
      const nonRanks = sortedRanks.filter((r) => r.rank === 0)
      const withRanks = sortedRanks.filter((r) => r.rank !== 0)

      const hasNonRanks = nonRanks.length > 0
      const hasRanks = withRanks.length > 0
      const hasMixedRanks = hasNonRanks && hasRanks

      const hasAllRankSeries = rankNums.every(
        (rankNum, index) => rankNum === index + 1
      )

      console.info("============================================")
      console.info("=", spellName)
      console.info("--------------------------------------------")
      console.info("=", "# of Ranks:", sortedRanks.length)
      console.info("=", "Non-Ranks:", nonRanks.length)
      console.info("=", "With-Ranks:", withRanks.length)
      console.info(
        "=",
        "Has no duplicate ranks:",
        logEmojiStatus(!hasDuplicateRanks)
      )
      console.info("=", "Has no mixed ranks:", logEmojiStatus(!hasMixedRanks))
      console.info(
        "=",
        "Has all ranks in order:",
        logEmojiStatus(hasAllRankSeries)
      )
      console.info("============================================")

      if (hasMixedRanks) {
        // Remove non-ranks from a mixed rank list
        cleanGroupedSpells[spellName] = withRanks
      } else {
        cleanGroupedSpells[spellName] = sortedRanks
      }
    })

    writeFileSync(
      path.join(
        BASE_DIR,
        SRC_DIR,
        CLASSES_DIR,
        `${cls.fileName}-by-spell-clean.json`
      ),
      JSON.stringify(cleanGroupedSpells, undefined, 2)
    )

    const allClassSpellRanks = Object.values(cleanGroupedSpells).flat()

    const cleanedClassSpells = allClassSpellRanks
      .map((spell) => {
        const ranks = getSpellRanks(allClassSpells, spell.name, true)
        const spellCopy = { ...spell }

        const isTriggeredBySpell = allSpells.find((acs) =>
          [
            acs.EffectTriggerSpell1,
            acs.EffectTriggerSpell2,
            acs.EffectTriggerSpell3,
          ].includes(spell.id)
        )

        let excludedDueToHiddenTriggerer = false

        if (isTriggeredBySpell) {
          const spellAttributes = getIdsFromMask(isTriggeredBySpell.Attributes)
          excludedDueToHiddenTriggerer = hiddenSpellAttributes.some(
            (hiddenSpellAttribute) =>
              spellAttributes.includes(hiddenSpellAttribute)
          )
          if (excludedDueToHiddenTriggerer) {
            console.info(
              spell.name,
              spell.id,
              "has been removed due to being triggered by an invisible spell"
            )
          }
        }

        let excludeDueToDuplicateRank = false

        // first remove the ones that doesn't have ranks
        const nonRanks = ranks.filter((r) => r.rank === 0).map((s) => s.id)

        excludeDueToDuplicateRank =
          nonRanks.length !== ranks.length && nonRanks.includes(spell.id)

        if (!excludeDueToDuplicateRank) {
          const rank1s = ranks.filter((r) => r.rank === spell.rank)
          const spells = rank1s.map((r) => allSpellsById[r.id])
          // first, check mana cost
          const manaCosts = spells.filter((s) => s.ManaCost > 0)
          if (manaCosts.length === 1) {
            // bingo! we have our spell

            excludeDueToDuplicateRank = spell.id !== manaCosts[0].ID
          }
        } else {
          console.info(
            spell.name,
            spell.id,
            "has been removed due to not having a rank"
          )
        }

        spellCopy.shouldBeExcluded =
          excludeDueToDuplicateRank || excludedDueToHiddenTriggerer // || excludeDueToRanks

        return spellCopy
      })
      .filter((cs) => !cs.shouldBeExcluded)
      .map((s) => {
        const { shouldBeExcluded, ...spl } = s
        return spl
      })

    cleanedClassSpells.forEach((spell) => {
      const sla = skillLineAbilitiesBySpellId[spell.id]
      if (sla?.SupercededBySpell) {
        const overrideIds = getSpellOverrides(cleanedClassSpells, spell)
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

    const classSpells = cleanedClassSpells
      .map((spell) => {
        const ranks = getSpellRanks(cleanedClassSpells, spell.name)
        const requiredId = getRequiredIdForSpellId(spell.id, ranks)
        const spellCopy = { ...spell }

        if (requiredId) {
          spellCopy.requiredIds = [requiredId]
        }

        return spellCopy
      })
      .filter((cs) => !cs.shouldBeExcluded)
      .map((s) => {
        const { rank, ...spl } = s
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
}

/**
 *
 * @param {object} options
 * @param {string} command
 */
const actionCommand = async ({ classes, extract }, command) => {
  const classList = classes ? classes.map((c) => c.toLowerCase()) : undefined
  start(classList, extract)
}

command
  .name("extract")
  .option(
    "-c,--classes <classes...>",
    "Space separated list of character class names to run the export for, if not specified the export will run on all classes. e.g. export -c priest mage"
  )
  .option(
    "-e,--extract",
    "whether to extract data from dbc files or not",
    false
  )
  .action(actionCommand)

command.parse()
