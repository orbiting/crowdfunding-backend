const Roles = require('../../../lib/Roles')

module.exports = async (_, { id }, { pgdb, user }) => {
  Roles.ensureUserHasRole(user, 'supporter')
  return pgdb.public.users.findOne({ id })
}
