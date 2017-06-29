//
// This script imports testimonials from a gsheet
// and looks for photos locally at ./local/photos/
//
// usage
// cf_server  node script/importTestimonials.js
//
require('dotenv').config()

const PgDb = require('../lib/pgdb')
const gsheets = require('gsheets')
const uploadExoscale = require('../lib/uploadExoscale')
const keyCDN = require('../lib/keyCDN')
const fs = require('fs')
const uuid = require('uuid/v4')
const convertImage = require('../lib/convertImage')


const GKEY = '1IoNowWMs6dK3OAK_uyWaZMQKrWU0H6LCTYedLcbHPXk'

const FOLDER = 'testimonials'
const { ASSETS_BASE_URL } = process.env
const {IMAGE_SIZE_SMALL, IMAGE_SIZE_SHARE} = convertImage


function randomString(len) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for( var i=0; i < len; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}


PgDb.connect().then( async (pgdb) => {

  const {S3BUCKET} = process.env

  let counter = 0

  const sheet = await gsheets.getWorksheet(GKEY, 'live')

  for(let person of sheet.data) {
    if(person.Filename && fs.existsSync(__dirname+'/local/photos/'+person.Filename)) {
      const names = person.Name.split(' ')

      const filename = person.Filename
      const firstName = names[0]
      const lastName = names.slice(1).join(' ')
      const email = person['E-Mailadresse']
      const quote = person.Statement
      const role = person.Bezeichnung
      let video
      if(person.hls && person.mp4) {
        video = {
          hls: person.hls,
          mp4: person.mp4,
          subtitles: person.subtitles,
          youtube: person.youtube,
        }
      }

      console.log(firstName+' '+lastName)

      let user = await pgdb.public.users.findOne({email})
      let testimonial
      if(user) {
        testimonial = await pgdb.public.testimonials.findOne({userId: user.id})
      }

      const id = testimonial ? testimonial.id : uuid()
      const pathOriginal = `/${FOLDER}/${id}_original.jpeg`
      const pathSmall = `/${FOLDER}/${id}_${IMAGE_SIZE_SMALL}x${IMAGE_SIZE_SMALL}.jpeg`
      const pathShare = `/${FOLDER}/${id}_${IMAGE_SIZE_SHARE}x${IMAGE_SIZE_SHARE}.jpeg`

      const image = fs.readFileSync(__dirname+'/local/photos/'+filename, 'binary')
      const inputBuffer = new Buffer(image, 'binary')

      await Promise.all([
        convertImage.toJPEG(inputBuffer)
          .then( (data) => {
            return uploadExoscale({
              stream: data,
              path: pathOriginal,
              mimeType: 'image/jpeg',
              bucket: S3BUCKET
            })
          }),
        convertImage.toSmallBW(inputBuffer)
          .then( (data) => {
            return uploadExoscale({
              stream: data,
              path: pathSmall,
              mimeType: 'image/jpeg',
              bucket: S3BUCKET
            })
          }),
        convertImage.toShare(inputBuffer)
          .then( (data) => {
            return uploadExoscale({
              stream: data,
              path: pathShare,
              mimeType: 'image/jpeg',
              bucket: S3BUCKET
            })
          })
      ])

      if(!user) {
        user = await pgdb.public.users.insertAndGet({
          firstName,
          lastName,
          email: email || `${randomString(10)}@anonymous.project-r.construction`,
          verified: true
        })
      }
      //load existing memberships
      const firstMembership = await pgdb.public.memberships.findFirst({
        userId: user.id
      }, {orderBy: ['sequenceNumber asc']})
      let sequenceNumber
      if(firstMembership)
        sequenceNumber = firstMembership.sequenceNumber

      if(!testimonial) {
        await pgdb.public.testimonials.insert({
          id,
          userId: user.id,
          role,
          quote,
          image: ASSETS_BASE_URL+pathSmall,
          video,
          sequenceNumber
        }, {skipUndefined: true})
      } else {
        keyCDN.purgeUrls([pathOriginal, pathSmall, pathShare])
        await pgdb.public.testimonials.updateAndGetOne({id: testimonial.id}, {
          role,
          quote,
          image: ASSETS_BASE_URL+pathSmall,
          video,
          sequenceNumber
        }, {skipUndefined: true})
      }
      counter += 1
      console.log('finished: '+firstName+' '+lastName)

    } else {
      console.log("photo not found: "+person.Filename)
    }
  }
  console.log(`${counter} people imported`)

}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
