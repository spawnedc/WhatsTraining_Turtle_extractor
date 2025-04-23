const getIdsFromMask = (mask, verbose = false) => {
  const binary = mask.toString(2)
  const binaryArray = binary.split("").map(Number).reverse()
  const ids = binaryArray.reduce((acc, curr, index) => {
    if (curr === 1) {
      return [...acc, index + 1]
    }

    return acc
  }, [])
  verbose &&
    console.info({
      mask,
      binary,
      hex: `0x${mask.toString(16)}`,
      binaryArray,
      ids,
    })
  return ids
}

const flags = []
for (let i = 0; i < 32; i++) {
  flags.push(Math.pow(2, i))
}

const getIdsFromMask2 = (mask, verbose = false) => {
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

export default getIdsFromMask2
