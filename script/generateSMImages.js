//
// This script imports testimonials from a gsheet
// and looks for photos locally at ./photos/
//
// usage
// cf_server  node script/importTestimonials.js
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

    console.log(`doing magic for magic id: ${testimonial.id}`)

    const smImagePath = `/${FOLDER}/${testimonial.id}_sm.jpeg`

    await renderUrl(`${FRONTEND_BASE_URL}/community?share=${testimonial.id}`)
      .then( async (data) => {
        return uploadExoscale({
          stream: data,
          path: smImagePath,
          mimeType: 'image/jpeg',
          bucket: BUCKET
        }).then( () => {
          return pgdb.public.testimonials.updateAndGetOne({id: testimonial.id}, {
            smImage: ASSETS_BASE_URL+smImagePath
          })
        })
      })

    counter += 1

  }))
  console.log(`${counter} images generated`)

}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
