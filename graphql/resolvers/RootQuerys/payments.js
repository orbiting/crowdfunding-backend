const Roles = require('../../../lib/Roles')
const deserializeOrderBy = require('../../../lib/deserializeOrderBy')

module.exports = async (
  _,
  { limit, offset, orderBy, search },
  { pgdb, user }
) => {
  Roles.ensureUserHasRole(user, 'supporter')

  const paymentIds = search
    ? (await pgdb.public.payments.findWhere(`
        hrid ILIKE :search OR
        "pspId" ILIKE :search
      `, {
        search: `${search}%`
      })).map(payment => payment.id)
    : null

  const options = {
    limit,
    offset,
    orderBy: (orderBy && deserializeOrderBy(orderBy)) || {
      createdAt: 'asc'
    }
  }

  const items = paymentIds
    ? await pgdb.public.payments.find({id: paymentIds}, options)
    : await pgdb.public.payments.findAll(options)

  const count = await pgdb.public.payments.count()
  return { items, count }
}
