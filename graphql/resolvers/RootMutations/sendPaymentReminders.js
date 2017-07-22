const Roles = require('../../../lib/Roles')
const sendMailTemplate = require('../../../lib/sendMailTemplate')
const {formatPrice} = require('../../../lib/formats')

module.exports = async (_, args, {pgdb, req, t}) => {
  Roles.ensureUserHasRole(req.user, 'supporter')

  // TODO remember reminder was sent

  const now = new Date()
  let {paymentIds} = args
  if (!paymentIds) {
    paymentIds = await pgdb.queryOneColumn(`SELECT id FROM payments`)
  }

  const payments = await pgdb.query(`
      SELECT
        u.email,
        pay.total,
        pay.hrid
      FROM
        payments pay
      JOIN
        "pledgePayments" pp
        ON pay.id=pp."paymentId"
      JOIN
        pledges p
        ON pp."pledgeId"=p.id
      JOIN
        users u
        ON p."userId"=u.id
      WHERE
        pay.status = 'WAITING' AND
        pay.method = 'PAYMENTSLIP' AND
        pay."dueDate" < :now AND
        ARRAY[pay.id] && :paymentIds
    `, {
      now,
      paymentIds
    })

  for (let payment of payments) {
    await sendMailTemplate({
      to: payment.email,
      fromEmail: process.env.DEFAULT_MAIL_FROM_ADDRESS,
      subject: t('api/email/payment/reminder/subject'),
      templateName: 'cf_payment_reminder',
      globalMergeVars: [
        { name: 'TOTAL',
          content: formatPrice(payment.total)
        },
        { name: 'HRID',
          content: payment.hrid
        }
      ]
    })
  }

  return payments.length
}
