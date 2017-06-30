require('dotenv').config()
const fetch = require('isomorphic-unfetch')
const sendMail = require('../lib/sendMail')

const {MANDRILL_API_KEY} = process.env

Promise.resolve().then(async () => {
  const messages = await (await fetch('https://mandrillapp.com/api/1.0/messages/search.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: process.env.MANDRILL_API_KEY,
      subject: 'Danke für Ihre Frage',
      date_to: '2017-04-27',
      senders: [
        'faq@republik.ch'
      ],
      limit: 1000
    })
  })).json()

  for (let message of messages) {
    const content = await (await fetch('https://mandrillapp.com/api/1.0/messages/content.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: MANDRILL_API_KEY,
        id: message._id
      })
    })).json()

    if (content.subject === 'Danke für Ihre Frage') {
      const questionRegex = /Herzlichen Dank für die folgende Frage:(.*?)Eine Antwort finden Sie/g
      const question = questionRegex.exec(content.text.replace(/(?:\r\n|\r|\n)/g, ' '))[1].trim()
      const text = `${content.to.email} hat folgende Frage gestellt:\n\n${question}`
      await sendMail({
        to: 'faq@republik.ch',
        fromEmail: 'faq@republik.ch',
        fromName: 'Republik',
        subject: `restored question of: ${content.to.email}`,
        text
      })
      console.log(`sent restored question from: ${content.to.email}`)
    }
  }
}).then(() => {
  process.exit()
}).catch(e => {
  console.error(e)
  process.exit(1)
})
