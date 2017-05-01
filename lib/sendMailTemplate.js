const fetch = require('isomorphic-unfetch')
//usage
//sendMailTemplate({
//  to: 'p@tte.io',
//  fromEmail: 'jefferson@project-r.construction',
//  fromName: 'Jefferson',
//  subject: 'dear friend',
//  templateName: 'MANDRIL TEMPLATE',
//  globalMergeVars: {
//    name: 'VARNAME',
//    content: 'replaced with this'
//  }
//})
module.exports = (mail) => {
  const {DEFAULT_MAIL_FROM_ADDRESS, DEFAULT_MAIL_FROM_NAME, NODE_ENV, SEND_MAILS} = process.env

  //sanitize
  const message = {
    to: [{email: mail.to}],
    subject: mail.subject,
    from_email: mail.fromEmail || DEFAULT_MAIL_FROM_ADDRESS,
    from_name: mail.fromName || DEFAULT_MAIL_FROM_NAME,
    global_merge_vars: mail.globalMergeVars,
    auto_text: true
  }

  //don't send in dev, expect SEND_MAILS is true
  //don't send mails if SEND_MAILS is false
  const DEV = NODE_ENV && NODE_ENV !== 'production'
  console.log('DEV '+DEV)
  console.log('SEND_MAILS '+SEND_MAILS)
  console.log('typeof SEND_MAILS '+ typeof SEND_MAILS)
  console.log('NODE_ENV '+NODE_ENV)
  if( (typeof SEND_MAILS !== 'undefined' && !SEND_MAILS) || (DEV && !SEND_MAILS) ) {
    console.log('\n\nmail (only sent in production):\n', mail)
    return true
  }

  return fetch('https://mandrillapp.com/api/1.0/messages/send-template.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: process.env.MANDRILL_API_KEY,
      template_name: mail.templateName,
      template_content: [],
      message
    })
  })
}

