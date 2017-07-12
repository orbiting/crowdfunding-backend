const Roles = require('../../../lib/Roles')
const logger = require('../../../lib/logger')

module.exports = async (_, args, {pgdb, req, t}) => {
  Roles.ensureUserHasRole(req.user, 'admin')
  const {role, userId} = args
  const user = await pgdb.public.users.findOne({id: userId})
  if (!user) {
    logger.error('user not found', { req: req._log() })
    throw new Error(t('api/users/404'))
  }
  return Roles.removeRoleFromUser(role, userId, pgdb)
}
