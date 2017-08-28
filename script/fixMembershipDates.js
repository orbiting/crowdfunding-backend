//
// This script sets the createdAt date of the memberships
// generated while running fixPaypal on 2017-08-28T16:55:50.631Z
// back to the createdAt date of their corresponding pledges.
// updatedAt is kept at 2017-08-28T16:55:50.631Z
//
// usage
// cf_server   node script/fixPaypal.js
//
require('dotenv').config()
const PgDb = require('../lib/pgdb')

PgDb.connect().then(async (pgdb) => {
  const transaction = await pgdb.transactionBegin()

  try {
    await transaction.query(`
      UPDATE
        memberships m
      SET
        "createdAt" = p."createdAt"
      FROM
        pledges p
      WHERE
        m."pledgeId" = p.id AND
        p.id IN (
          SELECT
            p.id
          FROM pledges p
          JOIN "pledgePayments" pp
            ON
              p.id = pp."pledgeId" AND
              pp."paymentId" IN (
                SELECT id FROM payments WHERE "updatedAt" = :updatedAt
              )
        )
    `, {
      updatedAt: new Date('2017-08-28T16:55:50.631Z')
    })
    await transaction.transactionCommit()
  } catch (e) {
    await transaction.transactionRollback()
    console.error('transaction rollback')
    throw e
  }
}).then(() => {
  process.exit()
}).catch(e => {
  console.error(e)
  process.exit(1)
})
