const logger = require('./logger')

module.exports = (req, t) => {
  if (!req.user) {
    logger.info('signIn', { req: req._log() })
    throw new Error(t('api/signIn'))
  }
}
