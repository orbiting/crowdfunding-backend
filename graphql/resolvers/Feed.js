const {descending} = require('d3-array')

module.exports = {
  async userIsEligitable(feed, args, {pgdb, user}) {
    if(!user)
      return false
    return !!(await pgdb.public.memberships.findFirst({userId: user.id}))
  },
  async userWaitUntil(feed, args, {pgdb, user}) {
    if(!user || !feed.commentInterval)
      return
    const now = new Date().getTime()
    const lastCommentByUser = await pgdb.public.comments.findFirst({
      userId: user.id,
      feedId: feed.id,
      published: true
    }, {
      orderBy: ['createdAt desc']
    })
    if(lastCommentByUser && lastCommentByUser.createdAt.getTime() > now-feed.commentInterval)
      return new Date((lastCommentByUser.createdAt.getTime()+feed.commentInterval))
    return
  },
  async comments(feed, args, {pgdb}) {
    const {offset, limit, firstId, tags, order} = args

    const firstComment = firstId
      ? await pgdb.public.comments.findOne({
          id: firstId,
          feedId: feed.id,
          published: true,
          adminUnpublished: false
        })
      : null


    let orderBy = 'hottnes DESC'
    if(order === 'NEW')
      orderBy = '"createdAt" DESC'
    if(order === 'TOP')
      orderBy = '"upVotes" - "downVotes" DESC'

    const comments = (await pgdb.public.comments.find({
      feedId: feed.id,
      published: true,
      adminUnpublished: false,
      'tags @>': tags,
      tags: (tags && tags.length === 0) ? '[]' : undefined
    }, {
      offset,
      limit,
      orderBy: [orderBy],
      skipUndefined: true
    })).map( c => Object.assign({}, c, {
      score: c.upVotes - c.downVotes
    }))

    return firstComment
      ? [firstComment].concat(comments.filter(c => c.id !== firstComment.id))
      : comments
  },
  async stats(feed, args, {pgdb}) {
    return {
      count: pgdb.public.comments.count({
        feedId: feed.id,
        published: true,
        adminUnpublished: false
      }),
      tags: [
        {
          tag: null,
          count: await pgdb.queryOneField(`
            SELECT
              count(*)
            FROM
              comments c
            WHERE
              c."feedId"=:feedId AND
              c.tags = '[]' AND
              c.published=:published AND
              c."adminUnpublished"=:adminUnpublished
          `, {
            feedId: feed.id,
            published: true,
            adminUnpublished: false,
          })
        }
      ]
        .concat(await pgdb.query(`
          SELECT
            tag as tag,
            count(*) as count
          FROM
            comments c,
            json_array_elements_text(c.tags::json) tag
          WHERE
            c."feedId"=:feedId AND
            c.published=:published AND
            c."adminUnpublished"=:adminUnpublished
          GROUP BY 1
        `, {
          feedId: feed.id,
          published: true,
          adminUnpublished: false,
        }))
        .sort((a, b) => descending(a.count, b.count))
    }
  }
}
