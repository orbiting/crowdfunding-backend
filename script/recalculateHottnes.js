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
const {descending} = require('d3-array')

PgDb.connect().then( async (pgdb) => {

  const DRY_MODE = process.argv[2] === 'dry'
  if(DRY_MODE) {
    console.log("RUN IN DRY MODE!!!")
  }

  console.log('recalculating hottnes...')

  let counter = 0
  const transaction = await pgdb.transactionBegin()
  try {

    const comments = (await pgdb.public.comments.find())
      .map( c => Object.assign({}, c, {
        newHottnes: hottnes(c.upVotes, c.downVotes, c.createdAt.getTime())
      }))

    console.log(comments.map(c => ({
      upVotes: c.upVotes,
      downVotes: c.downVotes,
      score: c.upVotes - c.downVotes,
      createdAt: c.createdAt,
      hottnes: c.hottnes,
      newHottnes: c.newHottnes,
      diff: c.hottnes - c.newHottnes
    })).sort( (a, b) => descending(a.newHottnes, b.newHottnes) ) )

    if(!DRY_MODE) {
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
