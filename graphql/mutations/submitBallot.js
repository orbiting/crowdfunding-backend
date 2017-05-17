const ensureSignedIn = require('../../lib/ensureSignedIn')
const logger = require('../../lib/logger')

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const { optionId } = args

  const transaction = await pgdb.transactionBegin()
  try {
    const votingOption = await transaction.public.votingOptions.findOne({id: optionId})
    if(!votingOption) {
      logger.error('votingOption not found', { req: req._log(), args })
      throw new Error(t('api/unexpected'))
    }

    //ensure user is elegitable
    if(!(await transaction.public.memberships.findFirst({userId: user.id}))) {
      logger.error('membership required', { req: req._log(), args })
      throw new Error(t('api/voting/membershipRequired'))
    }

    //ensure has not voted yet
    if(!!(await transaction.public.ballotIssuances.findFirst({
      userId: user.id,
      votingId: votingOption.votingId
    }))) {
      logger.error('voted already', { req: req._log(), args })
      throw new Error(t('api/voting/alreadyVoted'))
    }

    await transaction.public.ballotIssuances.insert({
      votingId: votingOption.votingId,
      userId: user.id
    })

    await transaction.public.ballots.insert({
      votingOptionId: optionId
    })

    await transaction.transactionCommit()
  } catch(e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw e
  }

  return true
}
