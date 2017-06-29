const ensureSignedIn = require('../../../lib/ensureSignedIn')
const voteComment = require('../../../lib/voteComment')

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)
  const { commentId } = args
  const vote = 1
  return voteComment(commentId, vote, pgdb, user, req, t)
}
