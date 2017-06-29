//
// This script imports our existing members
//
// usage
// cf_server  cat script/examples/members.csv | node script/importMembers.js
//
require('dotenv').config()

const PgDb = require('../lib/pgdb')
const {dsvFormat} = require('d3-dsv')
const csvParse = dsvFormat(',').parse
const rw = require('rw')

const ABO_PRICE = 24000

PgDb.connect().then( async (pgdb) => {
  //gather data
  const package = await pgdb.public.packages.findOne({name: 'ABO'})
  const packageOption = await pgdb.public.packageOptions.findOne({packageId: package.id})
  const membershipType = await pgdb.public.membershipTypes.findOne({name: 'ABO'})

  const inputFile = rw.readFileSync("/dev/stdin", "utf8");
  const people = csvParse(inputFile)
  for(let person of people) {
    const {firstName, lastName, email} = person

    console.log(firstName+' '+lastName)

    let user = await pgdb.public.users.findOne({email})
    if(!user) {
      user = await pgdb.public.users.insertAndGet({
        firstName,
        lastName,
        email,
        verified: true
      })
    }

    if(!(await pgdb.public.pledges.count({userId: user.id}))) {
      const pledge = await pgdb.public.pledges.insertAndGet({
        packageId: package.id,
        userId: user.id,
        status: 'SUCCESSFUL',
        total: ABO_PRICE,
        donation: 0,
        sendConfirmMail: false
      })
      await pgdb.public.pledgeOptions.insert({
        templateId: packageOption.id,
        pledgeId: pledge.id,
        amount: 1,
        price: ABO_PRICE
      })

      await pgdb.public.memberships.insert({
        userId: user.id,
        pledgeId: pledge.id,
        membershipTypeId: membershipType.id,
        beginDate: new Date(),
      })
    }
  }
  console.log(`users: ${await pgdb.public.users.count()}`)
  console.log(`memberships: ${await pgdb.public.memberships.count()}`)
  console.log(`payments: ${await pgdb.public.payments.count()} (zero is ok)`)

}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
