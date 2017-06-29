module.exports = {
  async stats(result) {
    if(result && result.stats) {
      return result.stats
    }
    return {}
  }
}
