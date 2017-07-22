const Roles = require('../../../lib/Roles')

module.exports = async (_, args, {pgdb, req, t}) => {
  return Roles.roles
}
