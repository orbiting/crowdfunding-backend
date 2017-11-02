const fetch = require('isomorphic-unfetch')

require('dotenv').config()
const {
  MAILCHIMP_MAIN_LIST_ID,
  MAILCHIMP_API_KEY
} = process.env

Promise.resolve().then(async () => {
  // await fetch(`https://us14.api.mailchimp.com/3.0/lists/${MAILCHIMP_MAIN_LIST_ID}/interest-categories`, {
  await fetch(`https://us14.api.mailchimp.com/3.0/lists/${MAILCHIMP_MAIN_LIST_ID}/interest-categories/acf1ad78a0/interests`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + (Buffer.from('anystring:' + MAILCHIMP_API_KEY).toString('base64'))
    }
  })
    .then(response => response.json())
    .then(response => { console.log(response); return response })
}).then(() => {
  process.exit()
}).catch(e => {
  console.error(e)
  process.exit(1)
})
