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
  const {DEFAULT_MAIL_FROM_ADDRESS, DEFAULT_MAIL_FROM_NAME} = process.env

  //sanitize
  const message = {
    to: [{email: mail.to}],
    subject: mail.subject,
    from_email: mail.fromEmail || DEFAULT_MAIL_FROM_ADDRESS,
    from_name: mail.fromName || DEFAULT_MAIL_FROM_NAME,
    global_merge_vars: mail.globalMergeVars,
    auto_text: true
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

