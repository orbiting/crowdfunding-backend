module.exports = {
  async options (voting, args, {pgdb}) {
    return pgdb.public.votingOptions.find({votingId: voting.id})
  },
  async turnout (voting, args, {pgdb}) {
    if (voting.result && voting.result.turnout) { // cached by countVoting
      return voting.result.turnout
    }
    return {
      eligitable: await pgdb.queryOneField(`SELECT count(distinct("userId")) FROM memberships`),
      submitted: await pgdb.public.ballots.count({votingId: voting.id})
    }
  },
  async userIsEligitable (voting, args, {pgdb, user}) {
    if (!user) { return false }
    return !!(await pgdb.public.memberships.findFirst({userId: user.id}))
  },
  async userHasSubmitted (voting, args, {pgdb, user}) {
    if (!user) { return false }
    return !!(await pgdb.public.ballots.findFirst({
      userId: user.id,
      votingId: voting.id
    }))
  }
  /* either voting.result is freezed into crowdfunding by countVoting
     or it must remain null. For live voting stats, the counts query from
     count voting has to be migrated into an apollo resolver, to provide
     VoteResult.options
  result (voting, args, {pgdb, user}) {
    return voting.result || {voting}
  }
  */
}
