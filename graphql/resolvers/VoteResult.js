module.exports = {
  async stats(result, args, {pgdb}) {
    if(result && result.stats) {
      return result.stats
    }
    return {}
  }
}
