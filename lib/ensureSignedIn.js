const logger = require('./logger')

module.exports = (req, t) => {
  if(!req.user) {
    logger.info('unauthorized', { req: req._log() })
    throw new Error(t('api/unauthorized'))
  }
}
