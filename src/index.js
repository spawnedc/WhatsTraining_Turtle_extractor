var DBC = require("./dbc");
var inquirer = require("inquirer");
var { Command } = require("commander");
var fs = require("fs");
var command = new Command();

const dbcPath = `${__dirname}/../data/dbc/`;

const dbcList = [];

const SUBST_PATTERN = "{*}";

fs.readdirSync(dbcPath).forEach((file) => {
  dbcList.push(file.replace(".dbc", ""));
});

const onlyProperties = (object, keys) =>
  Object.entries(object).reduce(
    (prev, [key, value]) => ({
      ...prev,
      ...(keys.includes(key) && { [key]: value }),
    }),
    {}
  );

/**
 *
 * @param {object} row
 * @param {string} search
 * @param {string[]} fields
 * @returns
 */
function searchInRow(row, search, fields, isAdvanced = false) {
  if (!search) return row;

  let _row = row;

  if (fields) {
    _row = onlyProperties(row, fields);
  }

  for (const prop of Object.values(_row)) {
    if (isAdvanced) {
      let replacement =
        typeof prop === "string"
          ? `"${JSON.stringify(prop).slice(1, -1)}"`
          : prop;
      let advancedSearch = search.split(SUBST_PATTERN).join(replacement);
      try {
        if (eval(advancedSearch)) return row;
      } catch (e) {
        console.error(advancedSearch);
        throw e;
      }
    } else {
      if (`${prop}`.search(search) >= 0) return row;
    }
  }

  return null;
}

function mysql_real_escape_string(str) {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case '"':
      case "'":
      case "\\":
      case "%":
        return "\\" + char; // prepends a backslash to backslash, percent,
      // and double/single quotes
      default:
        return char;
    }
  });
}

function toSql(fileName, row) {
  let tableName = `${fileName}_dbc`.toLowerCase();
  let values = Object.values(row).map((v) =>
    typeof v === "string" ? `'${mysql_real_escape_string(v)}'` : v
  );
  let keys = Object.keys(row).map((v) => "`" + v + "`");
  return `INSERT IGNORE INTO ${tableName} (${keys})\n VALUES (${values});`;
}

function extractDBC(
  dbcName,
  { search, schema, columns, outType, file, condition }
) {
  // console.log(`Reading ${dbcName}.dbc file`)

  const filePath = `${__dirname}/../data/dbc/${dbcName}.dbc`;

  if (!fs.existsSync(filePath)) {
    throw new Error(`${dbcName}.dbc doesn't exist`);
  }

  var dbc = new DBC(filePath, `${schema}/${dbcName.toLowerCase()}`);

  return dbc.toJSON().then(function (dbcTable) {
    const foundList = [];

    let isAdvanced = search && search.includes(SUBST_PATTERN);

    for (const row of dbcTable) {
      const found = searchInRow(row, search, columns, isAdvanced);
      if (found) foundList.push(found);
    }

    let result = [];
    switch (outType) {
      case "sql":
        for (const row of foundList) {
          result.push(toSql(dbcName, row));
        }
        result = result.join("\n");
        break;
      default:
        result = JSON.stringify(foundList, null, 2);
        break;
    }

    if (file) {
      fs.writeFileSync(file, result);
      console.log("Output file created: " + file);
      return;
    }

    console.log(result);
  });
}

/**
 *
 * @param {string} dbcName
 * @param {object} options
 * @param {string} command
 */
const actionCommand = async (
  dbcNames,
  { search, schema, columns, outType, file },
  command
) => {
  if (!dbcNames.length) dbcNames = dbcList;

  for (const dbc of dbcNames) {
    await extractDBC(dbc, { search, schema, columns, outType, file });
  }
};

command
  .name("node-dbc-reader")
  .arguments("<dbcname...>")
  .option(
    "-s,--search <text>",
    "Search text, it supports regex and advanced patterns. Check the README for further information"
  )
  .option(
    "-c,--columns <columns...>",
    "Comma separated list of DBC columns to use for the search, if not specified the search will run on all columns"
  )
  .option("-t,--out-type [type]", "Output types: sql, json", "json")
  .option("-f,--file <filename>", "Whether to save in a file or not")
  .option(
    "-s,--schema <schema_folder>",
    "Select the schema folder",
    "azerothcore"
  )
  .action(actionCommand);

command.parse();
