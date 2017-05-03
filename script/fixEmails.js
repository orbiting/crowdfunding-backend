//
// This script fixes casesensitive emails
// owned by Project R Genossenschaft
//
// usage
// cf_server   node script/fixEmails.js
//
require('dotenv').config()

const PgDb = require('../lib/pgdb')
const util = require('util')


PgDb.connect().then( async (pgdb) => {
  const transaction = await pgdb.transactionBegin()
  try {

    const emails = (await transaction.query(`
      SELECT LOWER(email) email, count(*)
      FROM users
      GROUP BY 1
      HAVING count(*) > 1;
    `)).map( result => result.email )
    console.log(`cleaning up ${emails.length} users`)

    for(let email of emails) {
      const users = await transaction.query(`SELECT * FROM users WHERE email ILIKE :email`, {email})
      let electedUser
      for(let userCandidate of users) {
        if(userCandidate.email.toLowerCase() === userCandidate.email)
          electedUser = userCandidate
      }
      if(!electedUser)
        electedUser = users[0]

      console.log('electedUser:---------------------------------')
      console.log(electedUser)
      console.log('candidates:----------------------------------')
      console.log(users)

      let birthday
      let addressId
      users.forEach( u => {
        if(!birthday && u.birthday)
          birthday = u.birthday
        if(!addressId && u.addressId)
          addressId = u.addressId
      })
      electedUser = await transaction.public.users.updateAndGetOne({id: electedUser.id}, {
        firstName: electedUser.firstName || users.find( u => u.firstName ).firstName || "",
        lastName: electedUser.lastName || users.find( u => u.lastName ).lastName || "",
        birthday: birthday,
        addressId: addressId
      })

      console.log('updated infos:--------------------------------')
      console.log(electedUser)

      const userIds = users.filter( u => u.id !== electedUser.id).map( u => u.id )

      //transfer belongings
      const paymentSources = await transaction.public.paymentSources.updateAndGet({userId: userIds}, {
        userId: electedUser.id
      })
      const pledges = await transaction.public.pledges.updateAndGet({userId: userIds}, {
        userId: electedUser.id
      })
      const memberships = await transaction.public.memberships.updateAndGet({userId: userIds}, {
        userId: electedUser.id
      })
      const testimonials = await transaction.public.testimonials.updateAndGet({userId: userIds}, {
        userId: electedUser.id
      })

      let sessions = []
      for(let userId of userIds) {
        let _sessions = await transaction.public.sessions.find({'sess @>': {passport: {user: userId}}})
        for(let session of _sessions) {
          const sess = Object.assign({}, session.sess, {
            passport: {user: electedUser.id}
          })
          sessions.push(await transaction.public.sessions.updateAndGet({sid: session.sid}, {sess}))
        }
      }


      //remove addresses
      const addressIds = users.filter( u => u.addressId && u.addressId !== electedUser.addressId).map( u => u.addressId )
      let addresses = []
      if(addressIds.length) {
        addresses = await transaction.public.addresses.deleteAndGet({id: addressIds})
      }

      //remove old users
      const oldUsers = await transaction.public.users.deleteAndGet({id: userIds})

      //make sure email is lower case now
      await transaction.public.users.update({id: electedUser.id}, {
        email: electedUser.email.toLowerCase()
      })

      console.log("old userIds")
      console.log(userIds)
      console.log("old addressIds")
      console.log(addressIds)
      console.log('paymentSources----------------------')
      console.log(paymentSources)
      console.log('pledges----------------------')
      console.log(pledges)
      console.log('memberships----------------------')
      console.log(memberships)
      console.log('testimonials----------------------')
      console.log(testimonials)
      console.log('sessions----------------------')
      console.log(util.inspect(sessions, {depth: null}))
      console.log('deleted_addresses----------------------')
      console.log(addresses)
      console.log('remaining address----------------------')
      console.log(await transaction.public.addresses.findOne({id: electedUser.addressId}))
      console.log('deleted users----------------------')
      console.log(oldUsers)
      console.log('----------------------------------------------------')
      console.log('----------------------------------------------------')

    }

    await transaction.transactionCommit()

  } catch(e) {
    await transaction.transactionRollback()
    console.error('transaction rollback')
    throw e
  }
}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
