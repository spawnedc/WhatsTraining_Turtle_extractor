const getObjectDiff = (obj1, obj2) => {
  const differences = {}

  for (const key in obj1) {
    if (obj1[key] !== obj2[key]) {
      differences[key] = { oldValue: obj1[key], newValue: obj2[key] }
    }
  }

  return differences
}

module.exports = getObjectDiff
