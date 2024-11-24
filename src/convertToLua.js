const { execSync } = require("child_process")
const { writeFileSync } = require("fs")
const jsonToLua = require("json_to_lua")
const path = require("path")
const { EXPORT_DIR, CLASSES_DIR, LUA_DIR } = require("./constants")

const targetDir = process.argv[2] || LUA_DIR

execSync(`mkdir -p ${LUA_DIR}`)

const classes = require(`./${path.join(EXPORT_DIR, "ChrClasses.json")}`)
const classFiles = classes.map((c) => c.Filename)
classFiles.forEach((classFile) => {
  try {
    const classData = require(`./${path.join(
      CLASSES_DIR,
      `${classFile}.json`
    )}`)
    const className = `${classFile[0].toUpperCase()}${classFile
      .slice(1)
      .toLowerCase()}`
    console.info("got", classFile)
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

    const targetFile = path.join(targetDir, `${className}.lua`)
    console.info("Writing ", targetFile)
    writeFileSync(targetFile, content.join("\n"))
  } catch (e) {
    console.info("Skipping", classFile)
  }
})
