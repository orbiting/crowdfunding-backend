const fetch = require('isomorphic-unfetch')

module.exports = (email, list, t) => {
  return fetch(`https://us14.api.mailchimp.com/3.0/lists/${list}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + (Buffer.from('anystring:' + process.env.MAILCHIMP_API_KEY).toString('base64'))
    },
    body: JSON.stringify({
      email_address: email,
      status: 'subscribed'
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.status >= 400) {
        if (data.title === 'Member Exists') {
          return { message: t('api/newsletter/alreadySubscribed') }
        }
        return { message: t('api/newsletter/subscriptionFailed') }
      }
      return {}
    })
}
