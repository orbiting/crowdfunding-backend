const querystring = require('querystring')

module.exports = (mail) => {
  const form = querystring.stringify(mail)
  const contentLength = form.length

  return fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic '+(new Buffer('api:'+process.env.MAILGUN_API_KEY).toString('base64')),
      'Content-Length': contentLength,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  })
}
