const ensureSignedIn = require('../../../lib/ensureSignedIn')
const updateUser = require('../../../lib/updateUser')

module.exports = async (_, args, {pgdb, req, t}) => {
  ensureSignedIn(req, t)
  return updateUser(args, {
    user: req.user,
    pgdb,
    req,
    t
  })
}
