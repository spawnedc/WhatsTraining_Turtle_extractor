import { execSync } from "child_process"
import { writeFileSync, readFileSync } from "fs"
import { jsonToLuaPretty } from "json_to_lua"
import { join } from "path"
import { CLASSES_DIR, LUA_DIR, JSON_DIR } from "./constants.js"

const convertToLua = () => {
  execSync(`mkdir -p ${LUA_DIR}`)

  const classes = JSON.parse(readFileSync(join(JSON_DIR, "ChrClasses.json")))
  const classFiles = classes.map((c) => c.FileName)
  classFiles.forEach((classFile) => {
    const classData = JSON.parse(
      readFileSync(join(CLASSES_DIR, `${classFile}.json`))
    )
    const className = `${classFile[0].toUpperCase()}${classFile
      .slice(1)
      .toLowerCase()}`
    console.info(`Saving ${className}.lua`)
    const luaContent = jsonToLuaPretty(
      JSON.stringify(classData.spellsByLevel),
      2
    ).replaceAll("Interface\\Icons\\", "Interface\\\\Icons\\\\")

    const content = ["setfenv(1, WhatsTraining)"]

    if (Object.values(classData.overriddenSpellsMap).length) {
      const overriddenSpellsMap = jsonToLuaPretty(
        JSON.stringify(classData.overriddenSpellsMap),
        1
      )
      content.push(`OverridenSpells["${className}"] = ${overriddenSpellsMap}`)
    }

    content.push(`ClassSpellsByLevel["${className}"] = ${luaContent}`)

    writeFileSync(join(LUA_DIR, `${className}.lua`), content.join("\n"))
  })
}

export default convertToLua
