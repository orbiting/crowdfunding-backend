module.exports = str => {
  const [key, direction] = str.split(':')
  return {
    [key]: direction.toLowerCase()
  }
}
