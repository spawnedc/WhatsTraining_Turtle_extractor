import { existsSync, writeFileSync, mkdirSync } from "fs"

import DBC from "./dbc.js"
import { join } from "path"

const extractDBC = async (dbcName, { schema, dbcPath, outDir }) => {
  console.log(`Reading ${dbcName}.dbc file`)

  const filePath = `${dbcPath}/${dbcName}.dbc`

  if (!existsSync(filePath)) {
    throw new Error(`${filePath} doesn't exist`)
  }

  const dbc = new DBC(filePath, `${schema}/${dbcName.toLowerCase()}`)
  const dbcTable = await dbc.toJSON()
  const result = JSON.stringify(dbcTable, null, 2)
  const file = join(outDir, `${dbcName}.json`)

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }

  writeFileSync(file, result)
  console.log("Output file created: " + file)
}

/**
 * @param {string[]} dbcName
 * @param {object} options
 */
const convertDbcToJson = async (
  dbcNames,
  { schema = "vanilla", dbcPath, outDir },
) => {
  for (const dbc of dbcNames) {
    await extractDBC(dbc, { schema, dbcPath, outDir })
  }
}

export default convertDbcToJson

// const command = new Command();

// command.name("node-dbc-reader")
//   .arguments('<dbcname...>')
//   .option('-s,--schema <schema_folder>', 'Select the schema folder', 'vanilla')
//   .option('-p,--dbcPath <dbcPath>', 'The location of DBC files')
//   .option('-o,--outDir <outDir>', 'The output directory to export the json file')
//   .action(actionCommand);

// command.parse();
