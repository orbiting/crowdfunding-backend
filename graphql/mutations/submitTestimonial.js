const ensureSignedIn = require('../../lib/ensureSignedIn')
const sharp = require("sharp")
const uploadExoscale = require('../../lib/uploadExoscale')
const logger = require('../../lib/logger')
const uuid = require('uuid/v4')
//const rw = require('rw')

const BUCKET = 'republik'
const FOLDER = 'testimonials'
const IMAGE_SIZE_SMALL = 256

module.exports = async (_, args, {loaders, pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const { role, quote, image } = args
  const { ASSETS_BASE_URL } = process.env

  // test with local image
  //const inputFile = rw.readFileSync(__dirname+'/../image.b64', 'utf8')
  //const inputBuffer = new Buffer(inputFile, 'base64')

  const transaction = await pgdb.transactionBegin()
  try {

    let testimonial = await transaction.public.testimonials.findOne({userId: req.user.id})

    if(!testimonial && !image) {
      logger.error('a new testimonials requires an image', { req: req._log(), args })
      throw new Error(t('api/testimonial/image/required'))
    }

    if(!image) {
      testimonial = await transaction.public.testimonials.updateAndGetOne({id: testimonial.id}, {
        role,
        quote
      })
    } else {

      const inputBuffer = new Buffer(image, 'base64')
      const id = testimonial ? testimonial.id : uuid()

      const pathSmall = `/${FOLDER}/${id}_${IMAGE_SIZE_SMALL}x${IMAGE_SIZE_SMALL}.jpeg`

      await Promise.all([
        sharp(inputBuffer)
          .jpeg({
            quality: 100
          })
          .toBuffer()
          .then( (data) => {
            uploadExoscale({
              stream: data,
              path: `/${FOLDER}/${id}_original.jpeg`,
              mimeType: 'image/jpeg',
              bucket: BUCKET
            })
          }),
        sharp(inputBuffer)
          .resize(IMAGE_SIZE_SMALL, IMAGE_SIZE_SMALL)
          .greyscale()
          .jpeg()
          .toBuffer()
          .then( (data) => {
            uploadExoscale({
              stream: data,
              path: pathSmall,
              mimeType: 'image/jpeg',
              bucket: BUCKET
            })
          })
      ])

      if(testimonial) {
        testimonial = await transaction.public.testimonials.updateAndGetOne({id: testimonial.id}, {
          role,
          quote,
          image: ASSETS_BASE_URL+pathSmall
        })
      } else {
        testimonial = await transaction.public.testimonials.insertAndGet({
          id,
          userId: req.user.id,
          role,
          quote,
          image: ASSETS_BASE_URL+pathSmall
        })
      }
    }

    await transaction.transactionCommit()

    //augement with name
    testimonial.name = `${req.user.firstName} ${req.user.lastName}`

    return testimonial

  } catch(e) {
    await transaction.transactionRollback()
    logger.info('transaction rollback', { req: req._log(), error: e })
    throw e
  }
}
