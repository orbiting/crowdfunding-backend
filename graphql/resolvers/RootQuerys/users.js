const Roles = require('../../../lib/Roles')

const deserializeOrderBy = str => {
  const [key, direction] = str.split(':')
  return {
    [key]: direction.toLowerCase()
  }
}

module.exports = async (
  _,
  { limit, offset, orderBy },
  { pgdb, user }
) => {
  Roles.ensureUserHasRole(user, 'supporter')
  const items = await pgdb.public.users.findAll({
    limit,
    offset,
    orderBy: (orderBy && deserializeOrderBy(orderBy)) || {
      createdAt: 'asc'
    }
  })
  const count = await pgdb.public.users.count()
  return { items, count }
}
