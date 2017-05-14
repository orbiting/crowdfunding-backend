const ensureSignedIn = require('../../lib/ensureSignedIn')
const logger = require('../../lib/logger')

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const { commentId, content } = args

  const transaction = await pgdb.transactionBegin()
  try {
    //ensure comment exists and belongs to user
    const comment = await pgdb.public.comments.findOne({id: commentId})
    if(!comment) {
      logger.error('comment not found', { req: req._log(), commentId, vote })
      throw new Error(t('api/comment/commentNotFound'))
    }
    if(comment.userId !== user.id) {
      logger.error('comment does not belong user', { req: req._log(), args })
      throw new Error(t('api/comment/notYours'))
    }

    const feed = await pgdb.public.feeds.findOne({id: comment.feedId})

    //ensure comment length is within limit
    if(content.length > feed.commentMaxLength) {
      logger.error('content too long', { req: req._log(), args })
      throw new Error(t('api/comment/tooLong'), {commentMaxLength: feed.commentMaxLength})
    }

    await pgdb.public.comments.update({
      id: comment.id,
    }, {
      content,
      updatedAt: new Date()
    })

    await transaction.transactionCommit()
  } catch(e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw e
  }

  return true
}
