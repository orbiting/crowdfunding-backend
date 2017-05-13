const ensureSignedIn = require('../../lib/ensureSignedIn')
const logger = require('../../lib/logger')

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const { feedId, content } = args

  //ensure feed exists
  const feed = await pgdb.public.feeds.findOne({id: feedId})
  if(!feed) {
    logger.error('submitComment: feed not found', { req: req._log(), args })
    throw new Error(t('api/comment/feedNotFound'))
  }

  //ensure user has membership
  const membership = await pgdb.public.memberships.findFirst({userId: user.id})
  if(!membership) {
    logger.error('submitComment: membership required', { req: req._log(), args })
    throw new Error(t('api/comment/membershipRequired'))
  }

  const transaction = await pgdb.transactionBegin()
  try {

    //ensure user is withing newCommentWaitingTime
    if(feed.newCommentWaitingTime) {
      const now = new Date().getTime()
      const lastCommentByUser = await pgdb.public.comments.findFirst({
        userId: user.id,
        feedId: feed.id
      }, {
        orderBy: ['createdAt desc']
      })
      if(lastCommentByUser && lastCommentByUser.createdAt > now-feed.newCommentWaitingTime) {
        logger.error('submitComment: too early', { req: req._log(), args })
        throw new Error(t('api/comment/tooEarly'), {
          waitFor: lastCommentByUser.createdAt+feed.newCommentWaitingTime-now
        })
      }
    }

    //ensure comment length is within limit
    if(content.length > feed.commentMaxLength) {
      logger.error('submitComment: content too long', { req: req._log(), args })
      throw new Error(t('api/comment/tooLong'), {commentMaxLength: feed.commentMaxLength})
    }

    await pgdb.public.comments.insert({
      feedId: feed.id,
      userId: user.id,
      content
    })

    await transaction.transactionCommit()
  } catch(e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw e
  }

  return true
}
