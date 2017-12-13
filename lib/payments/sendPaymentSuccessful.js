const sendMailTemplate = require('../sendMailTemplate')

module.exports = async (pledgeId, pgdb, t) => {
  const pledge = await pgdb.public.pledges.findOne({id: pledgeId})
  const user = await pgdb.public.users.findOne({id: pledge.userId})
  const pkg = await pgdb.public.packages.findOne({id: pledge.packageId})
  const memberships = await pgdb.public.memberships.find({pledgeId: pledge.id})

  const voucherCodes = memberships.map(m => m.voucherCode).filter(Boolean)

  // get packageOptions which include the NOTEBOOK
  const goodieNotebook = await pgdb.public.goodies.findOne({name: 'NOTEBOOK'})
  const rewardNotebook = await pgdb.public.rewards.findOne({id: goodieNotebook.rewardId})
  const pkgOptionsNotebook = await pgdb.public.packageOptions.find({rewardId: rewardNotebook.id})
  const goodieToadbag = await pgdb.public.goodies.findOne({name: 'TOADBAG'})
  const rewardToadbag = await pgdb.public.rewards.findOne({id: goodieToadbag.rewardId})
  const pkgOptionsToadbag = await pgdb.public.packageOptions.find({rewardId: rewardToadbag.id})

  const notebook = await pgdb.public.pledgeOptions.count({
    pledgeId: pledge.id,
    templateId: pkgOptionsNotebook.map(p => p.id),
    'amount >': 0
  })
  const toadbag = await pgdb.public.pledgeOptions.count({
    pledgeId: pledge.id,
    templateId: pkgOptionsToadbag.map(p => p.id),
    'amount >': 0
  })

  await sendMailTemplate({
    to: user.email,
    fromEmail: process.env.DEFAULT_MAIL_FROM_ADDRESS,
    subject: t('api/payment/received/mail/subject'),
    templateName: 'cf_successful_payment',
    globalMergeVars: [
      { name: 'NAME',
        content: user.firstName + ' ' + user.lastName
      },
      { name: 'ASK_PERSONAL_INFO',
        content: (!user.addressId || !user.birthday)
      },
      { name: 'NOTEBOOK_OR_TOADBAG',
        content: !!notebook || !!toadbag
      },
      { name: 'VOUCHER_CODES',
        content: pkg.name === 'ABO_GIVE' && voucherCodes.length
          ? voucherCodes.join(' ')
          : null
      }
    ]
  })
}
