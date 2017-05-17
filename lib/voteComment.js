const logger = require('./logger')

module.exports = async (commentId, vote, pgdb, user, req, t) => {
  if(vote !== 1 && vote !== -1) {
    logger.error('vote out of range', { req: req._log(), commentId, vote })
    throw new Error(t('api/unexpected'))
  }
  const transaction = await pgdb.transactionBegin()
  try {
    //ensure comment exists
    const comment = await transaction.public.comments.findOne({id: commentId})
    if(!comment) {
      logger.error('comment not found', { req: req._log(), commentId, vote })
      throw new Error(t('api/comment/commentNotFound'))
    }

    //ensure user has membership
    const membership = await transaction.public.memberships.findFirst({userId: user.id})
    if(!membership) {
      logger.error('membership required', { req: req._log(), commentId, vote })
      throw new Error(t('api/comment/membershipRequired'))
    }

    const existingUserVote = comment.votes.find( vote => vote.userId === user.id )
    if(!existingUserVote) {
      await transaction.public.comments.update({
        id: commentId,
      }, {
        upVotes: (vote === 1 ? comment.upVotes+1 : comment.upVotes),
        downVotes: (vote === 1 ? comment.downVotes : comment.downVotes+1),
        votes: comment.votes.concat([{
          userId: user.id,
          vote
        }])
      })
    } else if(existingUserVote.vote !== vote) {
      await transaction.public.comments.update({
        id: commentId,
      }, {
        upVotes: comment.upVotes+vote,
        downVotes: comment.downVotes-vote,
        votes: comment.votes.filter( vote => vote.userId !== user.id).concat([{
          userId: user.id,
          vote
        }])
      })
    }

    await transaction.transactionCommit()
  } catch(e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), commentId, vote, error: e })
    throw e
  }
  return true
}
