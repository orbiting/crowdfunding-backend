const logger = require('./logger')
const hottnes = require('./hottnes')

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
    let newComment
    if(!existingUserVote) {
      newComment = await transaction.public.comments.updateAndGetOne({
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
      newComment = await transaction.public.comments.updateAndGetOne({
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

    if(newComment) {
      newComment = await transaction.public.comments.updateAndGetOne({
        id: commentId,
      }, {
        hottnes: hottnes(newComment.upVotes, newComment.downVotes, newComment.createdAt.getTime())
      })
    }

    await transaction.transactionCommit()

    return newComment || comment

  } catch(e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), commentId, vote, error: e })
    throw e
  }
  return true
}
