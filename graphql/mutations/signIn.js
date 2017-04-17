const signIn = require('../../lib/signIn')

module.exports = async (_, args, {loaders, pgdb, user, req, t}) => {
  return signIn(args.email, req, t)
}
