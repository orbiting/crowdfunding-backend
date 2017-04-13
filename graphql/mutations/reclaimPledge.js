const logger = require('../../lib/logger')

module.exports = async (_, args, {loaders, pgdb, req, t}) => {
  const transaction = await pgdb.transactionBegin()
  try {
    const { pledgeClaim } = args
    //check pledgeId
    let pledge = await transaction.public.pledges.findOne({id: pledgeClaim.pledgeId})
    if(!pledge) {
      logger.error(`pledge (${pledgeClaim.pledgeId}) not found`, { req: req._log(), args, pledge })
      throw new Error(t('api/unexpected'))
    }

    //load original user of pledge
    const pledgeUser = await transaction.public.users.findOne({id: pledge.userId})
    if(pledgeUser.email === pledgeClaim.email) {
      logger.info('pledge already belongs to the claiming email', { req: req._log(), args, pledgeUser })
      return {
        pledgeId: pledge.id,
        userId: pledge.userId
      }
    }
    if(pledgeUser.verified) {
      logger.error('cannot claim pledges of verified users', { req: req._log(), args, pledge })
      throw new Error(t('api/unexpected'))
    }

    //check logged in user
    if(req.user) {
      if(req.user.email !== pledgeClaim.email) {
        logger.error('logged in users can only claim pledges to themselfs', { req: req._log(), args, pledge })
        throw new Error(t('api/unexpected'))
      }
      //transfer pledge to signin user
      pledge = await transaction.public.pledges.updateAndGetOne({id: pledge.id}, {userId: req.user.email})
    } else {
      //change email of pledgeUser
      await transaction.public.users.update({id: pledgeUser.id}, {email: pledgeClaim.email})
    }

    //commit transaction
    await transaction.transactionCommit()

    return {
      pledgeId: pledge.id,
      userId: pledge.userId
    }
  } catch(e) {
    await transaction.transactionRollback()
    logger.info('transaction rollback', { req: req._log(), error: e })
    throw e
  }
}
