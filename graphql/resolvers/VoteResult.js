module.exports = {
  // this only gets called if the vote has been counted
  // the redirect of result.voting would be needed for live
  // results, see graphql/resolvers/Voting.js
  stats (result) {
    if (result && result.stats) {
      return result.stats
    }
    return {voting: result.voting}
  }
}
