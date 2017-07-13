const Roles = require('../../../lib/Roles')

const deserializeOrderBy = str => {
  const [key, direction] = str.split(':')
  return {
    [key]: direction.toLowerCase()
  }
}

module.exports = async (
  _,
  { limit, offset, orderBy, search },
  { pgdb, user }
) => {
  Roles.ensureUserHasRole(user, 'supporter')
  const items = !search
    ? await pgdb.public.users.findAll({
      limit,
      offset,
      orderBy: (orderBy && deserializeOrderBy(orderBy)) || {
        createdAt: 'asc'
      }
    })
    : await pgdb.query(`
        SELECT
          u.*,
          concat_ws(' ',
            u."firstName"::text,
            u."lastName"::text,
            u.email::text,
            a.name::text,
            a.line1::text,
            a.line2::text,
            a.city::text,
            a.country::text,
            m."sequenceNumber"::text,
            ps."pspId"::text
          ) <->> :search AS word_sim,
          concat_ws(' ',
            u."firstName"::text,
            u."lastName"::text,
            u.email::text,
            a.name::text,
            a.line1::text,
            a.line2::text,
            a.city::text,
            a.country::text,
            m."sequenceNumber"::text,
            ps."pspId"::text
          ) <-> :search AS dist
        FROM
          users u
        LEFT JOIN
          addresses a
          ON a.id = u."addressId"
        LEFT JOIN
          memberships m
          ON m."userId" = u.id
        LEFT JOIN
          "paymentSources" ps
          ON ps."userId" = u.id
        ORDER BY
          word_sim, dist
        OFFSET :offset
        LIMIT :limit
     `, {
       search: search.trim(),
       limit,
       offset
     })
  const count = await pgdb.public.users.count()
  return { items, count }
}
