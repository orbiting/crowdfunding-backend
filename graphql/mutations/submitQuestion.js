const sendMail = require('../../lib/sendMail')
const sendMailTemplate = require('../../lib/sendMailTemplate')
const ensureSignedIn = require('../../lib/ensureSignedIn')

module.exports = async (_, args, {pgdb, user, req, t}) => {
  ensureSignedIn(req, t)

  const { question } = args
  let name = user.firstName ? [user.firstName, user.lastName].join(' ') : ''
  await Promise.all([
    sendMail({
      to: process.env.QUESTIONS_MAIL_ADDRESS,
      fromEmail: process.env.QUESTIONS_MAIL_ADDRESS,
      subject: 'new (FA)Question asked!',
      text: `${user.mail} - ${name} hat folgende Frage gestellt:\n\n${question}`
    }),
    sendMailTemplate({
      to: user.email,
      fromEmail: process.env.QUESTIONS_MAIL_ADDRESS,
      subject: t('api/faq/mail/subject'),
      templateName: 'cf_faq',
      globalMergeVars: [
        { name: 'NAME',
          content: user.firstName+' '+user.lastName
        },
        { name: 'QUESTION',
          content: question
        }
      ]
    })
  ])
  return {success: true}
}
