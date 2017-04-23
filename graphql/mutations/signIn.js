const signIn = require('../../lib/signIn')

module.exports = async (_, args, {pgdb, user, req, t}) => {
  return signIn(args.email, req, t)
}
