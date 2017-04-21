
module.exports = async (_, args, {pgdb}) => {
  const {seed, offset, limit, name} = args

  if(name) {
    const users = await pgdb.public.users.findWhere(`
      "firstName" % $1 OR "lastName" % $1 OR
      "firstName" ILIKE $2 OR "lastName" ILIKE $2
    `, [name, `${name}%`])
    if(!users.length)
      return []

    const testimonials = await pgdb.query(`
      SELECT t.id, t."userId", t.role, t.quote, t.video, t.image, t."createdAt", t."updatedAt"
      FROM users u
      JOIN testimonials t
      ON t."userId" = u.id
      WHERE u."firstName" % $1 OR u."lastName" % $1 OR u."firstName" ILIKE $2 OR u."lastName" ILIKE $2
    `, [name, `${name}%`])
    if(!testimonials.length)
      return []

    return testimonials.map( testimonial => {
      const user = users.find( user => user.id === testimonial.userId )
      return Object.assign({}, testimonial, {
        name: `${user.firstName} ${user.lastName}`
      })
    })

  } else {
    const testimonials = await pgdb.query(`
      SELECT id, "userId", role, quote, video, image, "createdAt", "updatedAt"
      FROM (
        SELECT
          setseed(:seed),
          NULL AS id,
          NULL AS "userId",
          NULL AS role,
          NULL AS quote,
          NULL AS video,
          NULL AS image,
          NULL AS "createdAt",
          NULL AS "updatedAt"

        UNION ALL

        SELECT null, id, "userId", role, quote, video, image, "createdAt", "updatedAt"
        FROM testimonials

        OFFSET 1
      ) s
      ORDER BY random()
      OFFSET :offset
      LIMIT :limit;
    `, {
      seed,
      offset,
      limit
    })
    if(!testimonials.length)
      return []

    const users = await pgdb.public.users.find({id: testimonials.map( t => t.userId )})
    return testimonials.map( testimonial => {
      const user = users.find( user => user.id === testimonial.userId )
      return Object.assign({}, testimonial, {
        name: `${user.firstName} ${user.lastName}`
      })
    })
  }
}
