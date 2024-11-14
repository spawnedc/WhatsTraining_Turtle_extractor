const getIdsFromMask = require("./utils/getIdsFromMask");

const maskArg = parseInt(process.argv[2], 10)

console.info(getIdsFromMask(maskArg))
