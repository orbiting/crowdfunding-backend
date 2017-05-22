//
// This script seeds the db with our comments
//
// usage
// cf_server  cat script/data/comments.json | node script/importComments.js
//

const rw = require('rw')
const PgDb = require('../lib/pgdb')
const hottnes = require('../lib/hottnes')
const uuid = require('uuid/v4')
const renderUrl = require('../lib/renderUrl')
const uploadExoscale = require('../lib/uploadExoscale')
const logger = require('../lib/logger')

const FOLDER = 'comments'
const { ASSETS_BASE_URL, FRONTEND_BASE_URL, S3BUCKET } = process.env

require('dotenv').config()

PgDb.connect().then( async (pgdb) => {
  const input = JSON.parse(rw.readFileSync('/dev/stdin', 'utf8'))
  if(!input || !input.comments) {
    console.error('input.comments required')
    process.exit(1)
  }
  console.log(`importing new comments...`)

  const transaction = await pgdb.transactionBegin()
  try {

    const date = new Date("2017-05-22T05:00:00.000Z")
    const feed = await pgdb.public.feeds.findOne({name: 'END_GOAL'})
    if(!feed) {
      throw new Error('feed not found')
    }

    for(let comment of input.comments) {
      const {email, content, tags} = comment

      const user = await pgdb.public.users.findOne({email})
      if(!user) {
        throw new Error('user not found for email: '+email)
      }

      const existingComment = await transaction.public.comments.findFirst({
        userId: user.id
      })

      if(existingComment) {
        await transaction.public.comments.updateOne({
          id: existingComment.id
        }, {
          content,
          tags
        })
      } else {
        await transaction.public.comments.insert({
          feedId: feed.id,
          userId: user.id,
          content,
          tags,
          hottnes: hottnes(0, 0, date),
          createdAt: date,
          updatedAt: date
        })
      }
    }

    await transaction.transactionCommit()

    console.log('DB import done, starting to generate sm images...')

    const comments = await pgdb.public.comments.find()
    for(let comment of comments) {
      try {
        const smImagePath = `/${FOLDER}/sm/${uuid()}_sm.png`
        await renderUrl(`${FRONTEND_BASE_URL}/vote?share=${comment.id}`, 1200, 628)
          .then( async (data) => {
            return uploadExoscale({
              stream: data,
              path: smImagePath,
              mimeType: 'image/png',
              bucket: S3BUCKET
            }).then( async () => {
              return pgdb.public.comments.updateOne({id: comment.id}, {
                smImage: ASSETS_BASE_URL+smImagePath
              })
            })
          })
      } catch(e) {
        logger.error('sm image render failed', { e })
      }
    }

    console.log('done! New comments:')
    console.log(await pgdb.public.comments.find({}, {orderBy: ['hottnes desc']}))
  } catch(e) {
    console.log('error in transaction! rolledback!')
    console.log(e)
    await transaction.transactionRollback()
  }
}).then( () => {
  process.exit()
}).catch( e => {
  console.log(e)
})
