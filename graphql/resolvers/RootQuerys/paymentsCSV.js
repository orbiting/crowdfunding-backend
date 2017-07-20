const {dsvFormat} = require('d3-dsv')
const csvFormat = dsvFormat(';').format
const Roles = require('../../../lib/Roles')

module.exports = async (_, args, {pgdb, user}) => {
  Roles.ensureUserHasRole(user, 'accountant')

  // TODO honour
  // const {paymentIds} = args

  const goodies = await pgdb.public.goodies.findAll()
  const membershipTypes = await pgdb.public.membershipTypes.findAll()
  const rewards = (await pgdb.public.rewards.findAll()).map(reward => {
    const goodie = goodies.find(g => g.rewardId === reward.id)
    const membershipType = membershipTypes.find(m => m.rewardId === reward.id)
    if (goodie) {
      return Object.assign({}, reward, {
        goodie,
        name: goodie.name
      })
    } else {
      return Object.assign({}, reward, {
        membershipType,
        name: membershipType.name
      })
    }
  })
  const pkgOptions = (await pgdb.public.packageOptions.findAll()).map(pkgOption =>
      Object.assign({}, pkgOption, {
        reward: rewards.find(r => r.id === pkgOption.rewardId)
      })
  )
  const aboPkgo = pkgOptions.filter(pkgo =>
      (pkgo.reward && pkgo.reward.name === 'ABO')
  )
  const aboBenefactorPkgos = pkgOptions.filter(pkgo =>
      (pkgo.reward && pkgo.reward.name === 'ABO_BENEFACTOR')
  )
  const notebookPkgos = pkgOptions.filter(pkgo =>
      (pkgo.reward && pkgo.reward.name === 'NOTEBOOK')
  )
  const donationPkgos = pkgOptions.filter(pkgo => !pkgo.reward)

  const payments = (await pgdb.query(`
    SELECT
      pay.id AS "paymentId",
      p.id AS "pledgeId",
      u.id AS "userId",
      u.email AS "email",
      u."firstName" AS "firstName",
      u."lastName" AS "lastName",
      p.status AS "pledgeStatus",
      p."createdAt" AS "pledgeCreatedAt",
      pay.method AS "paymentMethod",
      pay.status AS "paymentStatus",
      p.donation AS "donation",
      p.total AS "pledgeTotal",
      pay.total AS "paymentTotal",
      pay."updatedAt" AS "paymentUpdatedAt",
      array_to_json(array_agg(po)) AS "pledgeOptions"
    FROM
      payments pay
    JOIN
      "pledgePayments" pp
      ON pay.id = pp."paymentId"
    JOIN
      pledges p
      ON pp."pledgeId" = p.id
    JOIN
      "pledgeOptions" po
      ON p.id = po."pledgeId"
    JOIN
      users u
      ON p."userId" = u.id
    GROUP BY
      pay.id, p.id, u.id
    ORDER BY
      u.email
  `)).map(payment => {
    const {pledgeOptions} = payment

    const regularAbos = pledgeOptions.filter(plo => {
      const pkg = aboPkgo.find(pko => pko.id === plo.templateId)
      return (pkg && pkg.price === plo.price)
    })
    const reducedAbos = pledgeOptions.filter(plo => {
      const pkg = aboPkgo.find(pko => pko.id === plo.templateId)
      return (pkg && pkg.price < plo.price)
    })
    const benefactorAbos = pledgeOptions.filter(plo =>
        !!aboBenefactorPkgos.find(pko => pko.id === plo.templateId)
    )
    const notebooks = pledgeOptions.filter(plo =>
        !!notebookPkgos.find(pko => pko.id === plo.templateId)
    )
    const donations = pledgeOptions.filter(plo =>
        !!donationPkgos.find(pko => pko.id === plo.templateId)
    )

    const formatPrice = (price) => {
      return (price / 100.0).toFixed(2)
    }

    delete payment.pledgeOptions
    return {
      paymentId: payment.paymentId.substring(0, 13),
      pledgeId: payment.pledgeId.substring(0, 13),
      userId: payment.userId.substring(0, 13),
      email: payment.email,
      firstName: payment.firstName,
      lastName: payment.lastName,
      pledgeStatus: payment.pledgeStatus,
      pledgeCreatedAt: payment.pledgeCreatedAt,
      pledgeTotal: payment.pledgeTotal,
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      paymentTotal: payment.paymentTotal,
      paymentUpdatedAt: payment.paymentUpdatedAt,
      'ABO #': regularAbos.reduce((sum, d) => sum + d.amount, 0),
      'ABO total': formatPrice(regularAbos.reduce((sum, d) => sum + d.price, 0)),
      'ABO_REDUCED #': reducedAbos.reduce((sum, d) => sum + d.amount, 0),
      'ABO_REDUCED total': formatPrice(reducedAbos.reduce((sum, d) => sum + d.price, 0)),
      'ABO_BENEFACTOR #': benefactorAbos.reduce((sum, d) => sum + d.amount, 0),
      'ABO_BENEFACTOR total': formatPrice(benefactorAbos.reduce((sum, d) => sum + d.price, 0)),
      'NOTEBOOK #': notebooks.reduce((sum, d) => sum + d.amount, 0),
      'NOTEBOOK total': formatPrice(notebooks.reduce((sum, d) => sum + d.price, 0)),
      'DONATION #': donations.reduce((sum, d) => sum + d.amount, 0),
      'DONATION total': formatPrice(donations.reduce((sum, d) => sum + d.price, 0)),
      donation: payment.donation
    }
  })

  return csvFormat(payments)
}
