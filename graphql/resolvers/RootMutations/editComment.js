const ensureSignedIn = require('../../../lib/ensureSignedIn')
const logger = require('../../../lib/logger')
const slack = require('../../../lib/slack')
const uuid = require('uuid/v4')
const renderUrl = require('../../../lib/renderUrl')
const uploadExoscale = require('../../../lib/uploadExoscale')

const FOLDER = 'comments'
const { ASSETS_BASE_URL, FRONTEND_BASE_URL, S3BUCKET } = process.env

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const { commentId, content } = args

  const transaction = await pgdb.transactionBegin()
  try {
    // ensure comment exists and belongs to user
    const comment = await transaction.public.comments.findOne({id: commentId})
    if (!comment) {
      logger.error('comment not found', { req: req._log(), commentId })
      throw new Error(t('api/comment/commentNotFound'))
    }
    if (comment.userId !== user.id) {
      logger.error('comment does not belong to user', { req: req._log(), args })
      throw new Error(t('api/comment/notYours'))
    }

    const feed = await transaction.public.feeds.findOne({id: comment.feedId})

    // ensure comment length is within limit
    if (content.length > feed.commentMaxLength) {
      logger.error('content too long', { req: req._log(), args })
      throw new Error(t('api/comment/tooLong'), {commentMaxLength: feed.commentMaxLength})
    }

    const newComment = await transaction.public.comments.updateAndGetOne({
      id: comment.id
    }, {
      content,
      updatedAt: new Date()
    })

    await transaction.transactionCommit()

    // generate sm picture
    try {
      const smImagePath = `/${FOLDER}/sm/${uuid()}_sm.png`
      await renderUrl(`${FRONTEND_BASE_URL}/vote?share=${newComment.id}`, 1200, 628)
        .then(async (data) => {
          return uploadExoscale({
            stream: data,
            path: smImagePath,
            mimeType: 'image/png',
            bucket: S3BUCKET
          }).then(async () => {
            return pgdb.public.comments.updateOne({id: newComment.id}, {
              smImage: ASSETS_BASE_URL + smImagePath
            })
          })
        })
    } catch (e) {
      logger.error('sm image render failed', { req: req._log(), args, e })
    }

    try {
      await slack.publishCommentUpdate(user, newComment, comment)
    } catch (e) {
      logger.error('publish commentUpdate on slack failed', { req: req._log(), args, e })
    }

    return newComment
  } catch (e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw e
  }
}
