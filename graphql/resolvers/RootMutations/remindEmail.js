const subscribeToken = require('../../../lib/subscribeToken')
const sendMailTemplate = require('../../../lib/sendMailTemplate')

module.exports = async (_, args, {t}) => {
  const {email} = args
  const {PUBLIC_URL, REMIND_ME_LIST_ID} = process.env

  const token = subscribeToken(REMIND_ME_LIST_ID, email)

  const subscribeLink = PUBLIC_URL +
    '/newsletter/subscribe?' +
    'list=' + encodeURIComponent(REMIND_ME_LIST_ID) +
    '&email=' + encodeURIComponent(email) +
    '&token=' + encodeURIComponent(token) +
    '&successMessage=' + encodeURIComponent(t('api/remindeme/successMessage'))

  await sendMailTemplate({
    to: email,
    fromEmail: process.env.DEFAULT_MAIL_FROM_ADDRESS,
    subject: t('api/remindme/mail/subject'),
    templateName: 'cf_confirm_reminder',
    globalMergeVars: [
      { name: 'SUBSCRIBE_LINK',
        content: subscribeLink
      }
    ]
  })

  return true
}
