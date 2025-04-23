import { DBC_DIR } from "./constants.js"
import extractMPQ from "./tools/extractMPQ.js"

const [, , dataDir] = process.argv

const dbcFile = "dbc.MPQ"
const filesToExport = "DBFilesClient*"
const exportDir = DBC_DIR

if (!dataDir) {
  console.error("Please provide path to WoW data folder")
} else {
  extractMPQ(dataDir, dbcFile, filesToExport, exportDir)
}
