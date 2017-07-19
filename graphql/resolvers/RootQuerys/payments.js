const Roles = require('../../../lib/Roles')
const {dateRangeFilterWhere, stringArrayFilterWhere, booleanFilterWhere} = require('../../../lib/Filters')
const deserializeOrderBy = require('../../../lib/deserializeOrderBy')

const searchWhere = (search, prefix) => {
  if (!search) { return '' }
  return `
    ${prefix || ''}
    (hrid ILIKE :search OR
    "pspId" ILIKE :search)
  `
}

module.exports = async (
  _,
  { limit, offset, orderBy, search, dateRangeFilter, stringArrayFilter, booleanFilter },
  { pgdb, user }
) => {
  Roles.ensureUserHasRole(user, 'supporter')

  const options = {
    limit,
    offset,
    orderBy: (orderBy && deserializeOrderBy(orderBy)) || {
      createdAt: 'asc'
    }
  }

  const items = !(search || dateRangeFilter)
    ? await pgdb.public.payments.findAll(options)
    : await pgdb.public.payments.findWhere(`
      ${searchWhere(search)}
      ${dateRangeFilterWhere(dateRangeFilter, 'AND')}
      ${stringArrayFilterWhere(stringArrayFilter, 'AND')}
      ${booleanFilterWhere(booleanFilter, 'AND')}
    `, {
      search: `${search}%`,
      fromDate: dateRangeFilter ? dateRangeFilter.from : null,
      toDate: dateRangeFilter ? dateRangeFilter.to : null,
      stringArray: stringArrayFilter ? stringArrayFilter.values : null,
      booleanValue: booleanFilter ? booleanFilter.value : null
    }, options)

  const count = await pgdb.public.payments.count()
  return { items, count }
}
