//
// This script imports testimonials from a gsheet
// and looks for photos locally at ./photos/
//
// usage
// cf_server  node script/generateSMImages.js
//
require('dotenv').config()

const PgDb = require('../lib/pgdb')
const fetch = require('isomorphic-unfetch')
const uploadExoscale = require('../lib/uploadExoscale')
const keyCDN = require('../lib/keyCDN')
const renderUrl = require('../lib/renderUrl')

const FOLDER = 'testimonials'
const { ASSETS_BASE_URL, FRONTEND_BASE_URL, S3BUCKET } = process.env
const WITH_USER_NAME = false

PgDb.connect().then( async (pgdb) => {

  let counter = 0
  const testimonials = await pgdb.public.testimonials.find({})

  for(let testimonial of testimonials) {

    let smImagePath = `/${FOLDER}/sm/${testimonial.id}_sm.png`

    if(WITH_USER_NAME) {
      const user = await pgdb.public.users.findOne({id: testimonial.userId})
      smImagePath = `/${FOLDER}/sm/${user.firstName}_${user.lastName}.png`
    }

    const url = ASSETS_BASE_URL+smImagePath

    await renderUrl(`${FRONTEND_BASE_URL}/community?share=${testimonial.id}`, 1200, 628)
      .then( async (data) => {
        return uploadExoscale({
          stream: data,
          path: smImagePath,
          mimeType: 'image/png',
          bucket: S3BUCKET
        }).then( async () => {
          await keyCDN.purgeUrls([smImagePath])
          return pgdb.public.testimonials.updateAndGetOne({id: testimonial.id}, {
            smImage: url
          })
        })
      })
    console.log(`magic done for: ${url}`)

    counter += 1

  }
  console.log(`${counter} images generated`)

}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
