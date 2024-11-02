const getIdsFromMask = (mask, verbose = false) => {
  const binary = mask.toString(2);
  const binaryArray = binary.split("").map(Number).reverse();
  const ids = binaryArray.reduce((acc, curr, index) => {
    if (curr === 1) {
      return [...acc, index + 1];
    }

    return acc;
  }, []);
  verbose &&
    console.info({
      mask,
      binary,
      hex: `0x${mask.toString(16)}`,
      binaryArray,
      ids,
    });
  return ids;
};

module.exports = getIdsFromMask;
