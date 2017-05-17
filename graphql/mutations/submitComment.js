const ensureSignedIn = require('../../lib/ensureSignedIn')
const logger = require('../../lib/logger')

module.exports = async (_, args, {pgdb, user, req, t, publish}) => {
  ensureSignedIn(req, t)

  const { feedName, content, tags } = args

  //ensure feed exists
  const feed = await pgdb.public.feeds.findOne({name: feedName})
  if(!feed) {
    logger.error('feed not found', { req: req._log(), args })
    throw new Error(t('api/comment/feedNotFound'))
  }

  //ensure user has membership
  const membership = await pgdb.public.memberships.findFirst({userId: user.id})
  if(!membership) {
    logger.error('membership required', { req: req._log(), args })
    throw new Error(t('api/comment/membershipRequired'))
  }

  const transaction = await pgdb.transactionBegin()
  try {

    //ensure user is withing commentInterval
    if(feed.commentInterval) {
      const now = new Date().getTime()
      const lastCommentByUser = await pgdb.public.comments.findFirst({
        userId: user.id,
        feedId: feed.id,
        published: true
      }, {
        orderBy: ['createdAt desc']
      })
      if(lastCommentByUser && lastCommentByUser.createdAt.getTime() > now-feed.commentInterval) {
        const waitForMinutes = (lastCommentByUser.createdAt.getTime()+feed.commentInterval-now)/1000/60
        let waitFor
        if(waitForMinutes <= 60)
          waitFor = Math.ceil(waitForMinutes)+'m'
        else
          waitFor = Math.ceil(waitForMinutes/60)+'h'
        logger.error('too early', { req: req._log(), args })
        throw new Error( t('api/comment/tooEarly', { waitFor }) )
      }
    }

    //ensure comment length is within limit
    if(content.length > feed.commentMaxLength) {
      logger.error('content too long', { req: req._log(), args })
      throw new Error(t('api/comment/tooLong', {commentMaxLength: feed.commentMaxLength}))
    }

    const comment = await pgdb.public.comments.insertAndGet({
      feedId: feed.id,
      userId: user.id,
      content,
      tags: tags ? tags : []
    })

    await transaction.transactionCommit()
    await publish('commentAdded', comment)
  } catch(e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw e
  }

  return true
}
