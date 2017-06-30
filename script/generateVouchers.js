//
// This script fixes the counter gap by inserting 40 memberships
// owned by Project R Genossenschaft
//
// usage
// cf_server   node script/fixGap.js
//
require('dotenv').config()

const PgDb = require('../lib/pgdb')

const ABO_PRICE = 24000

PgDb.connect().then( async (pgdb) => {
  const numVouchers = process.argv[2]
  if(!numVouchers) {
    throw new Error("number if vouchers is required as first argument")
  }

  // gather data
  const pkg = await pgdb.public.packages.findOne({name: 'ABO'})
  const pkgOption = await pgdb.public.packageOptions.findOne({packageId: pkg.id})
  const membershipType = await pgdb.public.membershipTypes.findOne({name: 'ABO'})

  const user = await pgdb.public.users.findOne({email: 'jefferson@project-r.construction'})
  if(!user) {
    console.error('jefferson not found')
  }

  const pledge = await pgdb.public.pledges.insertAndGet({
    packageId: pkg.id,
    userId: user.id,
    status: 'SUCCESSFUL',
    total: ABO_PRICE*numVouchers,
    donation: 0,
    sendConfirmMail: false
  })
  await pgdb.public.pledgeOptions.insert({
    templateId: pkgOption.id,
    pledgeId: pledge.id,
    amount: numVouchers,
    price: ABO_PRICE
  })
  for (let counter = 0; counter < numVouchers; counter++) {

    await pgdb.public.memberships.insert({
      userId: user.id,
      pledgeId: pledge.id,
      membershipTypeId: membershipType.id,
      beginDate: new Date(),
    })
  }

  console.log(`memberships: ${await pgdb.public.memberships.count()}`)
}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
