const deserializeOrderBy = str => {
  const [key, direction] = str.split(':')
  return {
    [key]: direction.toLowerCase()
  }
}

module.exports = async (
  _,
  { limit, offset, orderBy },
  { pgdb }
) => {
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
