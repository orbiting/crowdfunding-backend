const Roles = require('../../../lib/Roles')
const logger = require('../../../lib/logger')
const {minTotal, regularTotal} = require('../../../lib/Pledge')

module.exports = async (_, args, {pgdb, req, t}) => {
  Roles.ensureUserHasRole(req.user, 'supporter')
  const { pledgeId, total, reason } = args
  const now = new Date()
  const transaction = await pgdb.transactionBegin()
  try {
    const pledge = await transaction.public.pledges.findOne({id: pledgeId})
    if (!pledge) {
      logger.error('pledge not found', { req: req._log(), pledgeId })
      throw new Error(t('api/pledge/404'))
    }

    // check for payments
    const payments = await transaction.query(`
      SELECT
        pay.*
      FROM
        payments pay
      JOIN
        "pledgePayments" pp
        ON pp."paymentId" = pay.id
      JOIN
        pledges p
        ON pp."pledgeId" = p.id
      WHERE
        p.id = :pledgeId
    `, {
      pledgeId
    })
    for (let payment of payments) {
      if (payment.status !== 'WAITING') {
        logger.error('pledge has payments', { req: req._log(), pledgeId })
        throw new Error(t('api/pledge/edit/payed'))
      }
    }

    // load original of chosen packageOptions
    const pledgeOptions = await transaction.public.pledgeOptions.find({
      pledgeId
    })
    const pledgeOptionsTemplateIds = pledgeOptions.map((plo) => plo.templateId)
    const packageOptions = await transaction.public.packageOptions.find({
      id: pledgeOptionsTemplateIds
    })
    console.log(pledgeOptions)
    console.log(packageOptions)

    // check total
    const pledgeMinTotal = minTotal(pledgeOptions, packageOptions)
    if (total < pledgeMinTotal) {
      logger.error(`total (${total}) must be >= (${pledgeMinTotal})`, { req: req._log(), args, pledgeMinTotal })
      throw new Error(t('api/unexpected'))
    }

    // calculate donation
    const pledgeRegularTotal = regularTotal(pledgeOptions, packageOptions)
    const donation = total - pledgeRegularTotal
    // check reason
    if (donation < 0 && !reason) {
      logger.error('you must provide a reason for reduced pledges', { req: req._log(), args, donation })
      throw new Error(t('api/pledge/reason'))
    }

    await transaction.public.pledges.updateOne({
      id: pledgeId
    }, {
      total: total,
      donation,
      reason,
      updatedAt: now
    }, {
      skipUndefined: true
    })

    await transaction.transactionCommit()
  } catch (e) {
    await transaction.transactionRollback()
    logger.info('transaction rollback', { req: req._log(), args, error: e })
    throw e
  }

  return pgdb.public.pledges.findOne({id: pledgeId})
}
