const sendMailTemplate = require('./sendMailTemplate')

module.exports = async (pledgeId, pgdb, t) => {
  const pledge = await pgdb.public.pledges.findOne({id: pledgeId})
  const user = await pgdb.public.users.findOne({id: pledge.userId})
  const package = await pgdb.public.packages.findOne({id: pledge.packageId})
  const memberships = await pgdb.public.memberships.find({pledgeId: pledge.id})

  await sendMailTemplate({
    to: user.email,
    fromEmail: process.env.DEFAULT_MAIL_FROM_ADDRESS,
    subject: t('api/pledge/mail/subject'),
    templateName: 'cf_successful_payment',
    globalMergeVars: [
      { name: 'NAME',
        content: user.name
      },
      { name: 'ASK_PERSONAL_INFO',
        content: (!user.addressId || !user.birthday)
      },
      { name: 'VOUCHER_CODES',
        content: package.name==='ABO_GIVE'
          ? memberships.map( m => m.voucherCode ).join(', ')
          : null
      },
    ]
  })

}
