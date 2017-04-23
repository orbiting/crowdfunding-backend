const uuid = require('uuid/v4')
const ensureSignedIn = require('../../lib/ensureSignedIn')
const logger = require('../../lib/logger')

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const testimonial = await pgdb.public.testimonials.findOne({userId: req.user.id})
  if(!testimonial) {
    logger.error('user has no testimonial', { req: req._log(), args })
    throw new Error(t('api/unexpected'))
  }

  await pgdb.public.testimonials.updateOne({id: testimonial.id}, {
    published: false
  })

}
