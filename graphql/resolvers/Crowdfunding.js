module.exports = {
  async packages (crowdfunding, args, {pgdb}) {
    return pgdb.public.packages.find({crowdfundingId: crowdfunding.id})
  },
  async goals (crowdfunding, args, {pgdb}) {
    return pgdb.public.crowdfundingGoals.find({crowdfundingId: crowdfunding.id}, {
      orderBy: ['people asc', 'money asc']
    })
  },
  async status (crowdfunding, args, {pgdb}) {
    const {forceUpdate} = args
    if (!forceUpdate && crowdfunding.result && crowdfunding.result.status) {
      return crowdfunding.result.status
    }
    const money = await pgdb.public.queryOneField(`SELECT SUM(total) FROM pledges WHERE status = 'SUCCESSFUL'`) || 0
    const people = await pgdb.public.queryOneField(`SELECT COUNT(id) FROM memberships`) || 0
    return {money, people}
  },
  hasEnded (crowdfunding) {
    const now = new Date()
    return now > new Date(crowdfunding.endDate)
  },
  endVideo (crowdfunding) {
    if (crowdfunding.result) {
      return crowdfunding.result.endVideo
    }
  }
}
