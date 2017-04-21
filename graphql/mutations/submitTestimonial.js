const ensureSignedIn = require('../../lib/ensureSignedIn')
const keyCDN = require('../../lib/keyCDN')
const logger = require('../../lib/logger')
const convertImage = require('../../lib/convertImage')
const uuid = require('uuid/v4')
//const rw = require('rw')
const uploadExoscale = require('../../lib/uploadExoscale')

const FOLDER = 'testimonials'
const BUCKET = 'republik'
const IMAGE_SIZE_SMALL = convertImage.IMAGE_SIZE_SMALL

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

      const pathOriginal = `/${FOLDER}/${id}_original.jpeg`
      const pathSmall = `/${FOLDER}/${id}_${IMAGE_SIZE_SMALL}x${IMAGE_SIZE_SMALL}.jpeg`

      await Promise.all([
        convertImage.toJPEG(inputBuffer)
          .then( (data) => {
            uploadExoscale({
              stream: data,
              path: pathOriginal,
              mimeType: 'image/jpeg',
              bucket: BUCKET
            })
          }),
        convertImage.toSmallBW(inputBuffer)
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
        keyCDN.purgeUrls([pathOriginal, pathSmall])
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
