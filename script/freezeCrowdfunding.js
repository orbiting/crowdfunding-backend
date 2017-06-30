//
// This script freezes the crowdfunding status into crowdfunding.result
// params
//   name: crowdfunding name
//   optional: video: hls, mp4, youtube, subtitles (if given, hls and mp4 are required)
//
// usage
// cf_server  node script/freezeCrowdfunding.js --name NAME
//

require('dotenv').config()
const PgDb = require('../lib/pgdb')
const Crowdfunding = require('../graphql/resolvers/Crowdfunding')

PgDb.connect().then(async (pgdb) => {
  const argv = require('minimist')(process.argv.slice(2))

  const {name} = argv
  if (!name) { throw new Error('name must be provided') }

  let video
  if (argv.hls || argv.mp4 || argv.youtube || argv.subtitles || argv.poster) {
    if (!argv.hls || !argv.mp4) {
      throw new Error('hls and mp4 are required for video')
    }
    video = {
      hls: argv.hls,
      mp4: argv.mp4,
      youtube: argv.youtube,
      subtitles: argv.subtitles,
      poster: argv.poster
    }
  }

  const transaction = await pgdb.transactionBegin()
  try {
    const crowdfunding = await pgdb.public.crowdfundings.findOne({ name })
    if (!crowdfunding) {
      throw new Error(`a crowdfunding with the name '${name}' could not be found!`)
    }

    const status = await Crowdfunding.status(crowdfunding, {forceUpdate: true}, {pgdb})

    const newCrowdfunding = await pgdb.public.crowdfundings.updateAndGetOne({
      id: crowdfunding.id
    }, {
      result: {
        status,
        endVideo: video
      }
    })
    console.log('finished! The result is:')
    console.log(newCrowdfunding.result)
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
