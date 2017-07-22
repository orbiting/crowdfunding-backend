//
// This script merges two users into one
// - fork of fixEmails.js
//
// usage
// node script/mergeUsers.js --target=thomas@example.com --alternative=thomas@example.comm
//
require('dotenv').config()

const PgDb = require('../lib/pgdb')
const util = require('util')

const argv = require('minimist')(process.argv.slice(2))

if (!argv.target) {
  throw new Error('missing target email')
}
if (!argv.alternative) {
  throw new Error('missing alternative email')
}

console.log(`MERGING ${argv.target} and ${argv.alternative}`)

const DRY_MODE = !argv.f
if (DRY_MODE) {
  console.log('DRY RUN')
}

PgDb.connect().then(async (pgdb) => {
  const transaction = await pgdb.transactionBegin()
  try {
    const users = await transaction.query(`
      SELECT *
      FROM users
      WHERE
        email = :email1 OR email = :email2
      ORDER BY "createdAt" ASC`, {
        email1: argv.target,
        email2: argv.alternative
      }
    )
    const electedUser = users[0] // oldest user for createdAt

    console.log('----------------------------------------------------')
    console.log('FOUND USERS')
    console.log(users)

    if (users.length !== 2) {
      throw new Error('couldn\'t find two users')
    }

    const userWithTargetEmail = users
      .find(u => u.email.toLowerCase() === argv.target.toLowerCase())

    const newUser = await transaction.public.users.updateAndGetOne({id: electedUser.id}, {
      firstName: users.map(u => u.firstName).filter(Boolean)[0],
      lastName: users.map(u => u.lastName).filter(Boolean)[0],
      birthday: users.map(u => u.birthday).filter(Boolean)[0],
      addressId: users.map(u => u.addressId).filter(Boolean)[0],
      verified: userWithTargetEmail.verified
    }, {skipUndefined: true})

    const userIds = users.filter(u => u.id !== newUser.id).map(u => u.id)

    // transfer belongings
    const paymentSources = await transaction.public.paymentSources.updateAndGet({userId: userIds}, {
      userId: newUser.id
    })
    const pledges = await transaction.public.pledges.updateAndGet({userId: userIds}, {
      userId: newUser.id
    })
    const memberships = await transaction.public.memberships.updateAndGet({userId: userIds}, {
      userId: newUser.id
    })
    const testimonials = await transaction.public.testimonials.updateAndGet({userId: userIds}, {
      userId: newUser.id
    })

    let sessions = []
    for (let userId of userIds) {
      let _sessions = await transaction.public.sessions.find({'sess @>': {passport: {user: userId}}})
      for (let session of _sessions) {
        const sess = Object.assign({}, session.sess, {
          passport: {user: newUser.id}
        })
        sessions.push(await transaction.public.sessions.updateAndGetOne({sid: session.sid}, {sess}))
      }
    }

    // remove addresses
    const addressIds = users.filter(u => u.addressId && u.addressId !== newUser.addressId).map(u => u.addressId)
    let addresses = []
    if (addressIds.length) {
      addresses = await transaction.public.addresses.deleteAndGet({id: addressIds})
    }

    // remove old users
    const oldUsers = await transaction.public.users.deleteAndGet({id: userIds})

    // ensure new user has target email
    const newUserWithEmail = await transaction.public.users.updateAndGetOne({id: newUser.id}, {
      email: argv.target
    })

    console.log('----------------------------------------------------')

    console.log('NEW USER')
    console.log(newUserWithEmail)

    console.log('----------------------------------------------------')
    console.log('TRANSFERED BELONGINGS')

    console.log('PAYMENT SOURCES')
    console.log(paymentSources)
    console.log('PLEDGES')
    console.log(pledges)
    console.log('MEMBERSHIPS')
    console.log(memberships)
    console.log('TESTIMONIALS')
    console.log(testimonials)
    console.log('SESSIONS')
    console.log(util.inspect(sessions, {depth: null}))
    console.log('ADDRESS')
    console.log(await transaction.public.addresses.findOne({id: newUser.addressId}))

    console.log('----------------------------------------------------')

    console.log('DELETED USER')
    console.log(oldUsers)
    console.log('DELETED ADDRESSES')
    console.log(addresses)

    console.log('----------------------------------------------------')

    if (!DRY_MODE) {
      await transaction.transactionCommit()
    } else {
      if (DRY_MODE) {
        console.log('DRY RUN')
        console.log('happy with the actions?')
        console.log('re-run with -f')
      }
      await transaction.transactionRollback()
    }
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
