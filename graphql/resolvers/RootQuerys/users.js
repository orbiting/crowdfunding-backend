const Roles = require('../../../lib/Roles')
const {dateRangeFilterWhere,
  stringArrayFilterWhere,
  booleanFilterWhere,
  andFilters} = require('../../../lib/Filters')
const deserializeOrderBy = require('../../../lib/deserializeOrderBy')

module.exports = async (
  _,
  { limit, offset, orderBy, search, dateRangeFilter, stringArrayFilter, booleanFilter },
  { pgdb, user }
) => {
  Roles.ensureUserHasRole(user, 'supporter')

  const orderByTerm = (orderBy && deserializeOrderBy(orderBy)) || {
    createdAt: 'asc'
  }

  const filterActive = (dateRangeFilter || stringArrayFilter || booleanFilter)
  const items = !(search || filterActive)
    ? await pgdb.public.users.findAll({
      limit,
      offset,
      orderByTerm
    })
    : await pgdb.query(`
        SELECT
          u.*
          ${search ? `,
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
          ` : ''}
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
        ${filterActive ? 'WHERE' : ''}
          ${andFilters([
            dateRangeFilterWhere(dateRangeFilter),
            stringArrayFilterWhere(stringArrayFilter),
            booleanFilterWhere(booleanFilter)
          ])}
        ORDER BY
          ${search ? 'word_sim, dist' : ':orderBy'}
        OFFSET :offset
        LIMIT :limit
     `, {
       search: search ? search.trim() : null,
       fromDate: dateRangeFilter ? dateRangeFilter.from : null,
       toDate: dateRangeFilter ? dateRangeFilter.to : null,
       stringArray: stringArrayFilter ? stringArrayFilter.values : null,
       booleanValue: booleanFilter ? booleanFilter.value : null,
       limit,
       offset,
       orderBy: orderByTerm // TODO fixme
     })
  const count = await pgdb.public.users.count()
  return { items, count }
}
