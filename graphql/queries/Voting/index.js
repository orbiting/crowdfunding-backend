module.exports = {
  async options(voting, args, {pgdb}) {
    return pgdb.public.votingOptions.find({votingId: voting.id})
  },
  async turnout(voting, args, {pgdb}) {
    return {
      eligitable: await pgdb.queryOneField(`SELECT count(distinct("userId")) FROM memberships`),
      submitted: await pgdb.public.ballots.count({votingId: voting.id})
    }
  },
  async userIsEligitable(voting, args, {pgdb, user}) {
    if(!user)
      return false
    return !!(await pgdb.public.memberships.findFirst({userId: user.id}))
  },
  async userHasSubmitted(voting, args, {pgdb, user}) {
    if(!user)
      return false
    return !!(await pgdb.public.ballots.findFirst({
      userId: user.id,
      votingId: voting.id
    }))
  },
}
