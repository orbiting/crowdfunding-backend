//
// This script adds the goodies notebook and toadbag to
// the presale crowdfunding.
//
// usage
// node seeds/goodies_for_presale.js
//

require('dotenv').config()
const PgDb = require('../lib/pgdb')

PgDb.connect().then(async (pgdb) => {
  if (await pgdb.public.goodies.findFirst({name: 'TOADBAG'})) {
    throw new Error('TOADBAG already found in goodies table, aborting!')
  }

  const transaction = await pgdb.transactionBegin()
  try {
    // insert toadbag
    const toadbagReward = await transaction.public.rewards.insertAndGet({
      type: 'Goodie'
    })

    const toadbagGoodie = await transaction.public.goodies.insertAndGet({
      rewardId: toadbagReward.id,
      rewardType: 'Goodie',
      name: 'TOADBAG'
    })

    // load notebook
    const presale = await transaction.public.crowdfundings.findOne({
      name: 'PRESALE'
    })
    const pkg = await transaction.public.packages.findOne({
      name: 'ABO_GIVE',
      crowdfundingId: presale.id
    })
    const notebookGoodie = await transaction.public.goodies.findOne({
      name: 'NOTEBOOK'
    })

    // insert packageOptions
    await transaction.public.packageOptions.insert({
      packageId: pkg.id,
      rewardId: notebookGoodie.rewardId,
      minAmount: 0,
      maxAmount: 100,
      defaultAmount: 0,
      price: 2000,
      userPrice: false
    })
    await transaction.public.packageOptions.insert({
      packageId: pkg.id,
      rewardId: toadbagGoodie.rewardId,
      minAmount: 0,
      maxAmount: 100,
      defaultAmount: 0,
      price: 2000,
      userPrice: false
    })

    console.log('finished.')
    await transaction.transactionCommit()
  } catch (e) {
    await transaction.transactionRollback()
    throw e
  }
}).then(() => {
  process.exit()
}).catch(e => {
  console.error(e)
  process.exit(1)
})
