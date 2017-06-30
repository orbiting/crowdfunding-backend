const ensureSignedIn = require('../../../lib/ensureSignedIn')
const logger = require('../../../lib/logger')

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const { optionId } = args

  const transaction = await pgdb.transactionBegin()
  try {
    const votingOption = await transaction.public.votingOptions.findOne({id: optionId})
    if (!votingOption) {
      logger.error('votingOption not found', { req: req._log(), args })
      throw new Error(t('api/unexpected'))
    }

    const now = new Date()
    const voting = await transaction.public.votings.findOne({id: votingOption.votingId})
    if (voting.beginDate > now) {
      logger.error('voting is not yet open', { req: req._log(), args })
      throw new Error(t('api/voting/tooEarly'))
    }
    if (voting.endDate < now) {
      logger.error('voting is closed', { req: req._log(), args })
      throw new Error(t('api/voting/tooLate'))
    }

    // ensure user is elegitable
    if (!(await transaction.public.memberships.findFirst({userId: user.id}))) {
      logger.error('membership required', { req: req._log(), args })
      throw new Error(t('api/voting/membershipRequired'))
    }

    // ensure user has not voted yet
    if (await transaction.public.ballots.findFirst({
      userId: user.id,
      votingId: votingOption.votingId
    })) {
      logger.error('voted already', { req: req._log(), args })
      throw new Error(t('api/voting/alreadyVoted'))
    }

    await transaction.public.ballots.insert({
      votingId: votingOption.votingId,
      votingOptionId: optionId,
      userId: user.id
    })

    await transaction.transactionCommit()
  } catch (e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw e
  }

  return true
}
