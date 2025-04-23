import { readFile } from "fs/promises"
import path from "path"
const MAGIC_NUMBER = 1128416343 // TODO: what's this?

class DBC {
  constructor(path, schemaName) {
    if (!schemaName) {
      throw new Error("You must define a schemaName before continue.")
    }

    this.path = path
    this.schemaName = schemaName
  }

  async getSchema() {
    const schemaName = this.schemaName
    const schemaPath = `./schemas/${schemaName}.json`
    const schema = await import(schemaPath, { with: { type: "json" } })

    return schema.default
  }

  parseStringBlock(buffer) {
    let pointer = 0
    let currentString = ""
    let strings = []

    for (let i = 0; i < buffer.length; i++) {
      let byte = buffer[i]

      if (byte === 0) {
        strings[pointer - currentString.length] = currentString
        currentString = ""
      } else {
        currentString += String.fromCharCode(byte)
      }

      pointer++
    }

    return strings
  }

  async toJSON() {
    const dbc = this
    const schemaFields = await this.getSchema()

    this.signature = ""
    this.records = 0
    this.fields = 0
    this.recordSize = 0

    return readFile(this.path)
      .then((data) => data)
      .then((buffer) => {
        dbc.signature = buffer.toString("utf8", 0, 4)

        if (dbc.signature !== "WDBC") {
          throw new Error(
            "DBC '" +
              path +
              "' has an invalid signature and is therefore not valid"
          )
        }

        if (buffer.readUInt32LE(0) !== MAGIC_NUMBER) {
          throw new Error(
            "File isn't valid DBC (missing magic number: " + MAGIC_NUMBER + ")"
          )
        }

        dbc.fields = buffer.readUInt32LE(8)
        dbc.records = buffer.readUInt32LE(4)
        dbc.recordSize = buffer.readUInt32LE(12)

        /**@type {buffer} */
        let recordBlock
        /**@type {buffer} */
        let recordData
        let stringBlockPosition = buffer.length - buffer.readUInt32LE(16)
        let strings = dbc.parseStringBlock(buffer.slice(stringBlockPosition))

        recordBlock = buffer.slice(20, stringBlockPosition)

        let rows

        dbc.rows = rows = []

        for (let i = 0; i < dbc.records; i++) {
          let row = {}
          recordData = recordBlock.slice(
            i * dbc.recordSize,
            (i + 1) * dbc.recordSize
          )
          let pointer = 0

          schemaFields.forEach(function (key, index) {
            let value
            let type = key.type
            let colName = key.name || "field_" + (index + 1)

            switch (type) {
              case "int":
                value = recordData.readInt32LE(pointer)
                break
              case "uint":
                value = recordData.readUInt32LE(pointer)
                break
              case "float":
                value = recordData.readFloatLE(pointer)
                break
              case "byte":
                value = recordData.readInt8(pointer)
                pointer += 1
                break
              case "loc":
              case "string":
                value = strings[recordData.readInt32LE(pointer)]
                break
              default:
                value = recordData.readInt32LE(pointer)
                break
            }

            row[colName] = value

            if (type !== "byte" && type !== "null" && type !== "loc") {
              pointer += 4
            } else if (type === "loc") {
              pointer += 36
            }
          })

          rows.push(row)
        }

        return dbc.rows
      })
  }
}

export default DBC
