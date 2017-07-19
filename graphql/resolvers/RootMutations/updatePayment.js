const Roles = require('../../../lib/Roles')
const logger = require('../../../lib/logger')
const generateMemberships = require('../../../lib/generateMemberships')
const sendPaymentSuccessful = require('../../../lib/sendPaymentSuccessful')

module.exports = async (_, args, {pgdb, req, t}) => {
  Roles.ensureUserHasRole(req.user, 'supporter')

  const { paymentId, status, reason } = args
  const now = new Date()
  const transaction = await pgdb.transactionBegin()

  try {
    const payment = await transaction.public.payments.findOne({id: paymentId})
    if (!payment) {
      logger.error('payment not found', { req: req._log(), args })
      throw new Error(t('api/payment/404'))
    }

    // check if state transform is allowed
    if (status === 'PAID') {
      if (payment.status !== 'WAITING') {
        logger.error('only payments with status WAITING can be set to PAID',
          { req: req._log(), args, payment }
        )
        throw new Error(t('api/unexpected'))
      }
      if (!reason) {
        logger.error('need reason', { req: req._log(), args, payment })
        throw new Error(t('package/customize/userPrice/reason/error'))
      }
    } else if (status === 'REFUNDED') {
      if (payment.status !== 'WAITING_FOR_REFUND') {
        logger.error('only payments with status WAITING_FOR_REFUND can be REFUNDED',
          { req: req._log(), args, payment }
        )
        throw new Error(t('api/unexpected'))
      }
    } else {
      logger.error('only change to PAID and REFUNDED supported.', { req: req._log(), args, payment })
      throw new Error(t('api/unexpected'))
    }

    await transaction.public.payments.updateOne({
      id: payment.id
    }, {
      status,
      updatedAt: now
    })

    // update pledge status
    if (status === 'PAID') {
      const pledge = (await transaction.query(`
        SELECT
          p.*
        FROM
          "pledgePayments" pp
        JOIN
          pledges p
          ON pp."pledgeId" = p.id
        WHERE
          pp."paymentId" = :paymentId
      `, {
        paymentId
      }))[0]

      const prefixedReason = 'Support: ' + reason
      await transaction.public.pledges.updateOne({
        id: pledge.id
      }, {
        status: 'SUCCESSFUL',
        updatedAt: now,
        reason: pledge.reason
          ? pledge.reason + '\n' + prefixedReason
          : prefixedReason
      })

      if (pledge.total > 100000) {
        await generateMemberships(pledge.id, transaction, t)
      }

      await sendPaymentSuccessful(pledge.id, transaction, t)
    }

    await transaction.transactionCommit()
  } catch (e) {
    await transaction.transactionRollback()
    logger.info('transaction rollback', { req: req._log(), args, error: e })
    throw e
  }

  return pgdb.public.payments.findOne({id: paymentId})
}
