const Roles = require('../../../lib/Roles')
const logger = require('../../../lib/logger')
const parsePostfinanceExport = require('../../../lib/parsePostfinanceExport')
const matchPayments = require('../../../lib/matchPayments')

const LOG_FAILED_INSERTS = false

const insertPayments = async (paymentsInput, tableName, pgdb) => {
  const numPaymentsBefore = await pgdb.public[tableName].count()
  let numFailed = 0
  await Promise.all(
    paymentsInput.map(payment => {
      return pgdb.public[tableName].insert(payment)
        .then(() => { return {payment, status: 'resolved'} })
        .catch(e => { numFailed += 1; return {payment, e, status: 'rejected'} })
    })
  ).then(results => {
    if (LOG_FAILED_INSERTS) {
      const rejected = results.filter(x => x.status === 'rejected')
      rejected.forEach(promise => {
        console.log('could not insert row:')
        console.log(promise.e.message)
        console.log(promise.payment)
        console.log('---------------------')
      })
    }
  })
  if (LOG_FAILED_INSERTS) {
    console.log(`Failed to insert ${numFailed} payments.`)
  }
  return numPaymentsBefore
}

module.exports = async (_, args, {pgdb, req, t}) => {
  Roles.ensureUserHasRole(req.user, 'accountant')
  const { csv } = args

  const input = Buffer.from(csv, 'base64').toString()

  const paymentsInput = parsePostfinanceExport(input)
  if (paymentsInput.length === 0) {
    return 'input empty. done nothing.'
  }

  // insert into db
  // this is done outside of transaction because it's
  // ment to throw on duplicate rows and doesn't change other records
  const numPaymentsBefore = await insertPayments(paymentsInput, 'postfinancePayments', pgdb)
  const numPaymentsAfter = await pgdb.public.postfinancePayments.count()

  const transaction = await pgdb.transactionBegin()
  try {
    const {
      numMatchedPayments,
      numUpdatedPledges,
      numPaymentsSuccessful
    } = await matchPayments(transaction, t)

    await transaction.transactionCommit()

    return `
num new payments: ${numPaymentsBefore - numPaymentsAfter}
num matched payments: ${numMatchedPayments}
num updated pledges: ${numUpdatedPledges}
num payments successfull: ${numPaymentsSuccessful}
    `
  } catch (e) {
    await transaction.transactionRollback()
    logger.info('transaction rollback', { req: req._log(), args, error: e })
    throw e
  }
}
