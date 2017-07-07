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
          "id",
          "firstName",
          "lastName",
          "email",
          "verified",
          "birthday",
          "phoneNumber",
          "addressId",
          ts_rank_cd(textsearch, query) AS rank
        FROM (
          SELECT
            u."id" as "id",
            u."firstName" as "firstName",
            u."lastName" as "lastName",
            u."email" as "email",
            u."verified" as "verified",
            u."birthday" as "birthday",
            u."phoneNumber" as "phoneNumber",
            u."addressId" as "addressId",
            to_tsvector(concat_ws(' ',
              u."firstName"::text,
              u."lastName"::text,
              a.name::text,
              a.line1::text,
              a.line2::text,
              a.city::text,
              a.country::text,
              m."sequenceNumber"::text
          )) AS textsearch
          FROM
            users u
          LEFT JOIN
            addresses a
            ON a.id = u."addressId"
          LEFT JOIN
            memberships m
            ON m."userId" = u.id
        ) as t1,
          to_tsquery(:search) query
        WHERE
          query @@ textsearch
        ORDER BY
          rank DESC
        OFFSET :offset
        LIMIT :limit
     `, {
       // plainto_tsquery(:search) query
       // search: search.trim(),
       search: search.split(' ').join('|'),
       limit,
       offset
     })
  const count = await pgdb.public.users.count()
  return { items, count }
}
