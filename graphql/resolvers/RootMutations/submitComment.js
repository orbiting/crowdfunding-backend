const ensureSignedIn = require('../../../lib/ensureSignedIn')
const logger = require('../../../lib/logger')
const slack = require('../../../lib/slack')
const hottnes = require('../../../lib/hottnes')
const uuid = require('uuid/v4')
const renderUrl = require('../../../lib/renderUrl')
const uploadExoscale = require('../../../lib/uploadExoscale')

const FOLDER = 'comments'
const { ASSETS_BASE_URL, FRONTEND_BASE_URL, S3BUCKET } = process.env

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const { feedName, content, tags } = args

  const transaction = await pgdb.transactionBegin()
  try {
    // ensure feed exists
    const feed = await transaction.public.feeds.findOne({name: feedName})
    if (!feed) {
      logger.error('feed not found', { req: req._log(), args })
      throw new Error(t('api/comment/feedNotFound'))
    }

    // ensure user has membership
    const membership = await transaction.public.memberships.findFirst({userId: user.id})
    if (!membership) {
      logger.error('membership required', { req: req._log(), args })
      throw new Error(t('api/comment/membershipRequired'))
    }

    // ensure user is within commentInterval
    if (feed.commentInterval) {
      const now = new Date().getTime()
      const lastCommentByUser = await transaction.public.comments.findFirst({
        userId: user.id,
        feedId: feed.id,
        published: true
      }, {
        orderBy: ['createdAt desc']
      })
      if (lastCommentByUser && lastCommentByUser.createdAt.getTime() > now - feed.commentInterval) {
        const waitForMinutes = (lastCommentByUser.createdAt.getTime() + feed.commentInterval - now) / 1000 / 60
        let waitFor
        if (waitForMinutes <= 60) { waitFor = Math.ceil(waitForMinutes) + 'm' } else { waitFor = Math.ceil(waitForMinutes / 60) + 'h' }
        logger.error('too early', { req: req._log(), args })
        throw new Error(t('api/comment/tooEarly', { waitFor }))
      }
    }

    // ensure comment length is within limit
    if (content.length > feed.commentMaxLength) {
      logger.error('content too long', { req: req._log(), args })
      throw new Error(t('api/comment/tooLong', {commentMaxLength: feed.commentMaxLength}))
    }

    const comment = await transaction.public.comments.insertAndGet({
      feedId: feed.id,
      userId: user.id,
      content,
      tags: tags || [],
      hottnes: hottnes(0, 0, (new Date().getTime()))
    })

    await transaction.transactionCommit()

    // generate sm picture
    try {
      const smImagePath = `/${FOLDER}/sm/${uuid()}_sm.png`
      await renderUrl(`${FRONTEND_BASE_URL}/vote?share=${comment.id}`, 1200, 628)
        .then(async (data) => {
          return uploadExoscale({
            stream: data,
            path: smImagePath,
            mimeType: 'image/png',
            bucket: S3BUCKET
          }).then(async () => {
            return pgdb.public.comments.updateOne({id: comment.id}, {
              smImage: ASSETS_BASE_URL + smImagePath
            })
          })
        })
    } catch (e) {
      logger.error('sm image render failed', { req: req._log(), args, e })
    }

    try {
      await slack.publishComment(user, comment)
    } catch (e) {
      logger.error('publish comment on slack failed', { req: req._log(), args, e })
    }

    return comment
  } catch (e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw e
  }
}
