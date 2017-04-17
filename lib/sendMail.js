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
  //sanitize
  mail.to = [{email: mail.to}]
  mail.from_email = mail.fromEmail
  mail.from_name = mail.fromName
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

