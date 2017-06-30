const signIn = require('../../../lib/signIn')

module.exports = async (_, args, {pgdb, req, t}) => {
  return signIn(args.email, args.context, pgdb, req, t)
}
