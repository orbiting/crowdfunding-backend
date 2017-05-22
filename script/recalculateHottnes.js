//
// This script recalculates the hottnes of all comments
// Use it to refresh the DB entities, when the hottnes algorithm
// changed
//
// usage
// cf_server  node script/recalculateHottnes.js
//

const PgDb = require('../lib/pgdb')
require('dotenv').config()
const hottnes = require('../lib/hottnes')

PgDb.connect().then( async (pgdb) => {
  console.log('recalculating hottnes...')

  let counter = 0
  const transaction = await pgdb.transactionBegin()
  try {

    const comments = (await pgdb.public.comments.find())
      .map( c => Object.assign({}, c, {
        newHottnes: hottnes(c.upVotes, c.downVotes, c.createdAt.getTime())
      }))

    for(let comment of comments) {
      if(comment.newHottnes !== comment.hottnes) {
        counter += 1
        await pgdb.public.comments.updateOne({
          id: comment.id
        }, {
          hottnes: comment.newHottnes
        })
      }
    }

    console.log(`finished updating ${counter} comments!`)
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
