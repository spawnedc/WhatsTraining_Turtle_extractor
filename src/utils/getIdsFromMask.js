const flags = []
for (let i = 0; i < 32; i++) {
  flags.push(Math.pow(2, i))
}

const getIdsFromMask = (mask, verbose = false) => {
  const maskValues = []
  const maskIndexes = []
  let newMask = mask
  while (newMask > 0) {
    const maskIndex = flags.findIndex((flag) => flag > newMask) - 1
    const maskValue = flags[maskIndex]
    newMask -= maskValue
    maskValues.push(maskValue)
    maskIndexes.push(maskIndex + 1)
  }

  return maskIndexes
}

module.exports = getIdsFromMask
