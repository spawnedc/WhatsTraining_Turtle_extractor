import { execSync } from "child_process"
import { writeFileSync } from "fs"
import { jsonToLuaPretty } from "json_to_lua"
import { join } from "path"
import { EXPORT_DIR, CLASSES_DIR, LUA_DIR } from "./constants"

execSync(`mkdir -p ${LUA_DIR}`)

const classes = require(`./${join(EXPORT_DIR, "ChrClasses.json")}`)
const classFiles = classes.map((c) => c.Filename)
classFiles.forEach((classFile) => {
  const classData = require(`./${join(CLASSES_DIR, `${classFile}.json`)}`)
  const className = `${classFile[0].toUpperCase()}${classFile
    .slice(1)
    .toLowerCase()}`
  console.info("got", classFile)
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
