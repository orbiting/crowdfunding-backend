require('dotenv').config()
const fetch = require('isomorphic-unfetch')

const {MANDRILL_API_KEY} = process.env

Promise.resolve().then( async () => {

  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  const emails = (await (await fetch('https://mandrillapp.com/api/1.0/messages/search.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: MANDRILL_API_KEY,
      subject: 'Danke für Ihre Frage',
      senders: [
        "faq@republik.ch"
      ],
      limit: 10000
    })
  })).json())
    .filter( message => message.email !== 'faq@republik.ch')
    .map( message => message.email )
    .filter( onlyUnique )

  for(let email of emails) {
    console.log(email)
  }

}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
