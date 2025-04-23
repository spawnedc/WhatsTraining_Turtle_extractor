import convertToLua from "./convertToLua.js"
import extractClassData from "./export.js"

await extractClassData()
convertToLua()
console.info("All done.")
