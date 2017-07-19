const Roles = require('../../../lib/Roles')
const deserializeOrderBy = require('../../../lib/deserializeOrderBy')

module.exports = async (
  _,
  { limit, offset, orderBy, search },
  { pgdb, user }
) => {
  Roles.ensureUserHasRole(user, 'supporter')

  const items = !search
    ? await pgdb.public.postfinancePayments.findAll({
      limit,
      offset,
      orderBy: (orderBy && deserializeOrderBy(orderBy)) || {
        createdAt: 'asc'
      }
    })
    : await pgdb.query(`
        SELECT
          pfp.*,
          concat_ws(' ',
            pfp.mitteilung::text,
            pfp.avisierungstext::text
          ) <->> :search AS word_sim
        FROM
          "postfinancePayments" pfp
        ORDER BY
          word_sim
        OFFSET :offset
        LIMIT :limit
      `, {
        search: search.trim(),
        limit,
        offset
      })

  const count = await pgdb.public.postfinancePayments.count()
  return { items, count }
}
