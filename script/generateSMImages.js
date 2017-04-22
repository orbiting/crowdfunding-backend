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
const BUCKET = 'republik'
const { ASSETS_BASE_URL, FRONTEND_BASE_URL } = process.env

PgDb.connect().then( async (pgdb) => {

  let counter = 0

  const testimonials = await pgdb.public.testimonials.find({})

  await Promise.all(testimonials.map( async (testimonial) => {

    const smImagePath = `/${FOLDER}/sm/${testimonial.id}_sm.png`
    const url = ASSETS_BASE_URL+smImagePath

    await renderUrl(`${FRONTEND_BASE_URL}/community?share=${testimonial.id}`, 1200, 628)
      .then( async (data) => {
        return uploadExoscale({
          stream: data,
          path: smImagePath,
          mimeType: 'image/png',
          bucket: BUCKET
        }).then( async () => {
          await keyCDN.purgeUrls([url])
          return pgdb.public.testimonials.updateAndGetOne({id: testimonial.id}, {
            smImage: url
          })
        })
      })
    console.log(`magic done for: ${url}`)

    counter += 1

  }))
  console.log(`${counter} images generated`)

}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
