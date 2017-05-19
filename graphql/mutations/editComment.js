const ensureSignedIn = require('../../lib/ensureSignedIn')
const logger = require('../../lib/logger')
const slack = require('../../lib/slack')

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const { commentId, content } = args

  const transaction = await pgdb.transactionBegin()
  try {
    //ensure comment exists and belongs to user
    const comment = await transaction.public.comments.findOne({id: commentId})
    if(!comment) {
      logger.error('comment not found', { req: req._log(), commentId })
      throw new Error(t('api/comment/commentNotFound'))
    }
    if(comment.userId !== user.id) {
      logger.error('comment does not belong to user', { req: req._log(), args })
      throw new Error(t('api/comment/notYours'))
    }

    const feed = await transaction.public.feeds.findOne({id: comment.feedId})

    //ensure comment length is within limit
    if(content.length > feed.commentMaxLength) {
      logger.error('content too long', { req: req._log(), args })
      throw new Error(t('api/comment/tooLong'), {commentMaxLength: feed.commentMaxLength})
    }

    const newComment = await transaction.public.comments.updateAndGetOne({
      id: comment.id,
    }, {
      content,
      updatedAt: new Date()
    })
    await slack.publishComment(user, newComment, comment)

    await transaction.transactionCommit()
  } catch(e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw e
  }

  return true
}
