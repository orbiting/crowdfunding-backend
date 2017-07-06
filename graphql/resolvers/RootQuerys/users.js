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
  const items = await pgdb.query(`
    SELECT
      u.*
    FROM
      users u
    LEFT JOIN
      addresses a
      ON a.id = u."addressId"
    LEFT JOIN
      memberships m
      ON m."userId" = u.id
    WHERE
      u."firstName" % :search OR
      u."lastName" % :search OR
      u.email % :search OR
      a.name ILIKE :searchLike OR
      a.line1 ILIKE :searchLike OR
      a.line2 ILIKE :searchLike OR
      a.city ILIKE :searchLike OR
      a.country ILIKE :searchLike OR
      m."sequenceNumber"::text ILIKE :searchLike
    ORDER BY :orderBy
    OFFSET :offset
    LIMIT :limit;
  `, {
    search,
    searchLike: search + '%',
    limit,
    offset,
    orderBy: (orderBy && deserializeOrderBy(orderBy)) || {
      createdAt: 'asc'
    }
  })
  const count = await pgdb.public.users.count()
  return { items, count }
}
