//
// This script fixes the counter gap by inserting 40 memberships
// owned by Project R Genossenschaft
//
// usage
// cf_server   node script/fixGap.js
//
require('dotenv').config()

const PgDb = require('../lib/pgdb')

const ABO_PRICE = 0

PgDb.connect().then( async (pgdb) => {
  //gather data
  const package = await pgdb.public.packages.findOne({name: 'ABO'})
  const packageOption = await pgdb.public.packageOptions.findOne({packageId: package.id})
  const membershipType = await pgdb.public.membershipTypes.findOne({name: 'ABO'})

  const user = await pgdb.public.users.findOne({email: 'jefferson@project-r.construction'})
  if(!user) {
    console.error('jefferson not found')
  }

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
    amount: 5780-5748, //32
    price: ABO_PRICE
  })
  let sequenceNumber
  for (sequenceNumber = 5748; sequenceNumber < 5780; sequenceNumber++) {
    if(!(await pgdb.public.memberships.findFirst({sequenceNumber}))) {

      await pgdb.public.memberships.insert({
        userId: user.id,
        pledgeId: pledge.id,
        membershipTypeId: membershipType.id,
        beginDate: new Date(),
        sequenceNumber
      })
    }
  }
  console.log(`memberships: ${await pgdb.public.memberships.count()}`)
}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
