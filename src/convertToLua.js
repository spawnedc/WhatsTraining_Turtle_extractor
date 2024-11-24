const { execSync } = require("child_process")
const { writeFileSync } = require("fs")
const { Command } = require("commander")
const command = new Command()
const jsonToLua = require("json_to_lua")
const path = require("path")
const { EXPORT_DIR, CLASSES_DIR, LUA_DIR } = require("./constants")

const start = (classNames, outputDir = LUA_DIR) => {
  execSync(`mkdir -p ${outputDir}`)

  const classes = require(`./${path.join(EXPORT_DIR, "ChrClasses.json")}`)
  const filteredClasses = classNames
    ? classes.filter((cls) => classNames.includes(cls.Filename.toLowerCase()))
    : classes

  const classFiles = filteredClasses.map((c) => c.Filename)
  classFiles.forEach((classFile) => {
    try {
      const classData = require(`./${path.join(
        CLASSES_DIR,
        `${classFile}.json`
      )}`)
      const className = `${classFile[0].toUpperCase()}${classFile
        .slice(1)
        .toLowerCase()}`
      const luaContent = jsonToLua
        .jsonToLuaPretty(JSON.stringify(classData.spellsByLevel), 2)
        .replaceAll("Interface\\Icons\\", "Interface\\\\Icons\\\\")

      const content = ["setfenv(1, WhatsTraining)"]

      if (Object.values(classData.overriddenSpellsMap).length) {
        const overriddenSpellsMap = jsonToLua.jsonToLuaPretty(
          JSON.stringify(classData.overriddenSpellsMap),
          1
        )
        content.push(`OverridenSpells["${className}"] = ${overriddenSpellsMap}`)
      }

      content.push(`ClassSpellsByLevel["${className}"] = ${luaContent}`)

      const targetFile = path.join(outputDir, `${className}.lua`)
      console.info("Writing", className)
      writeFileSync(targetFile, content.join("\n"))
    } catch (e) {
      console.info("Skipping", classFile)
      console.info(e)
    }
  })
}

/**
 *
 * @param {object} options
 * @param {string} command
 */
const actionCommand = async ({ classes, outputDir }, command) => {
  const classList = classes ? classes.map((c) => c.toLowerCase()) : undefined
  start(classList, outputDir)
}

command
  .name("extract")
  .option(
    "-c,--classes <classes...>",
    "Space separated list of character class names to run the export for, if not specified the export will run on all classes. e.g. export -c priest mage"
  )
  .option(
    "-o,--output-dir <path>",
    "The directory to output the lua files to. Defaults to 'build/lua'"
  )
  .action(actionCommand)

command.parse()
