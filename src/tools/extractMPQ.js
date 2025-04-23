import { readdir } from "fs/promises"
import { existsSync, mkdirSync } from "fs"
import { join } from "path"
import { execSync } from "child_process"
import { BASE_DIR } from "../constants.js"

const BASE_COMMAND = `${BASE_DIR}/bin/MPQExtractor`

const getPatchFiles = async (dataDir) => {
  const files = await readdir(dataDir)
  const patchFiles = files
    .filter((f) => f.toLowerCase().startsWith("patch"))
    .map((f) => join(dataDir, f))
  const mainPatch = patchFiles.pop()
  patchFiles.unshift(mainPatch)

  return patchFiles
}

/**
 * Exports files from MPQ files
 * @param {string} dataDir Wow Data directory where the MPQ files are stored
 * @param {string} dbcFile DBC file name to extract. It shouldn't be an absolute path
 * @param {string} filesToExport Pattern of files to be exported e.g. "DBFilesClient\\*"
 * @param {string} exportDir Directory to export the files to
 */
const extractMPQ = async (dataDir, dbcFile, filesToExport, exportDir) => {
  const patchFiles = await getPatchFiles(dataDir)
  const command = [
    BASE_COMMAND,
    `"${join(dataDir, dbcFile)}"`,
    `-o ${exportDir}`,
    `-e "${filesToExport}"`,
    ...patchFiles.map((p) => `-p "${p}"`),
  ]

  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true })
  }

  console.info("Extracting from", dbcFile, "...")
  execSync(command.join(" \\\n\t"))
}

const [, , dataDir, dbcFile, filesToExport, exportDir] = process.argv

extractMPQ(dataDir, dbcFile, filesToExport, exportDir)
