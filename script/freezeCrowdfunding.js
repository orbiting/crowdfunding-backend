//
// This script freezes the crowdfunding status into crowdfunding.result
// params
//   crowdfunding name
//
// usage
// cf_server  node script/freezeCrowdfunding.js --name NAME
//


require('dotenv').config()
const PgDb = require('../lib/pgdb')
const Crowdfunding = require('../graphql/queries/Crowdfunding/index')

PgDb.connect().then( async (pgdb) => {
  const argv = require('minimist')(process.argv.slice(2))

  const {name} = argv

  if(!name)
    throw new Error('name must be provided')

  const transaction = await pgdb.transactionBegin()
  try {
    const crowdfunding = await pgdb.public.crowdfundings.findOne({ name })
    if(!crowdfunding) {
      throw new Error(`a crowdfunding with the name '${name}' could not be found!`)
    }

    const status = await Crowdfunding.status(crowdfunding, {forceUpdate: true}, {pgdb})

    const newCrowdfunding = await pgdb.public.crowdfundings.updateAndGetOne({
      id: crowdfunding.id
    }, {
      result: {
        status
      }
    })
    console.log("finished! The result is:")
    console.log(newCrowdfunding.result)
  } catch(e) {
    await transaction.transactionRollback()
    throw e
  }
}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
