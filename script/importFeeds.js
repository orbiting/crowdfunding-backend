//
// This script imports additional feeds
//
// usage
// cf_server  cat script/data/feeds.json | node script/importFeeds.js
//

const PgDb = require('../lib/pgdb')
const rw = require('rw')

require('dotenv').config()

PgDb.connect().then(async (pgdb) => {
  const input = JSON.parse(rw.readFileSync('/dev/stdin', 'utf8'))
  if (!input || !input.feeds) {
    console.error('input.feeds required')
    process.exit(1)
  }
  console.log(`importing new feeds...`)

  const transaction = await pgdb.transactionBegin()
  try {
    for (let feed of input.feeds) {
      const {name, commentMaxLength, commentInterval} = feed

      const existingFeed = await transaction.public.feeds.findOne({name})

      if (existingFeed) { // update existing
        await transaction.public.feeds.updateOne({id: existingFeed.id}, {
          commentMaxLength,
          commentInterval,
          updatedAt: new Date()
        }, {skipUndefined: true})
      } else {
        await transaction.public.feeds.insert({
          name,
          commentMaxLength,
          commentInterval
        }, {skipUndefined: true})
      }
    }

    await transaction.transactionCommit()

    console.log('done! New feeds:')
    console.log(await pgdb.public.feeds.find({}, {orderBy: ['createdAt desc']}))
  } catch (e) {
    console.log('error in transaction! rolledback!')
    console.log(e)
    await transaction.transactionRollback()
  }
}).then(() => {
  process.exit()
}).catch(e => {
  console.log(e)
})
