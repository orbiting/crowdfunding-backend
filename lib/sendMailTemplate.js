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
  //sanitize
  const message = {
    to: [{email: mail.to}],
    subject: mail.subject,
    from_email: mail.fromEmail,
    from_name: mail.fromName,
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

