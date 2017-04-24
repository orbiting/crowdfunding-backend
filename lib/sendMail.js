const fetch = require('isomorphic-unfetch')
//usage
//sendMail({
//  to: 'p@tte.io',
//  fromEmail: 'jefferson@project-r.construction',
//  fromName: 'Jefferson',
//  subject: 'dear friend',
//  text: 'asdf asdf'
//})
module.exports = (mail) => {
  const {DEFAULT_MAIL_FROM_ADDRESS, DEFAULT_MAIL_FROM_NAME} = process.env

  //sanitize
  mail.to = [{email: mail.to}]
  mail.from_email = mail.fromEmail || DEFAULT_MAIL_FROM_ADDRESS
  mail.from_name = mail.fromName || DEFAULT_MAIL_FROM_NAME
  delete mail.fromName
  delete mail.fromEmail

  return fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: process.env.MANDRILL_API_KEY,
      message: mail
    })
  })
}

