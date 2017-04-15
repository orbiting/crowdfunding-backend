const logger = require('../../lib/logger')

module.exports = async (_, args, {loaders, pgdb, user, req}) => {
  if(!req.session)
    return
  req.session.destroy(function(error) {
    if(error) {
      logger.error('error trying to destroy session', { req: req._log(), error })
    }
  })
  return true
}
