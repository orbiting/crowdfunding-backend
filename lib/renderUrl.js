const fetch = require('isomorphic-unfetch')
require('dotenv').config()

module.exports = (url) => {
  const {PHANTOMJSCLOUD_API_KEY, BASIC_AUTH_USER, BASIC_AUTH_PASS} = process.env

  return (await fetch(`https://PhantomJsCloud.com/api/browser/v2/${PHANTOMJSCLOUD_API_KEY}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      content: null,
      urlSettings: {
        operation: 'GET',
        encoding: 'utf8',
        headers: {},
        data: null
      },
      renderType: 'jpg',
      outputAsJson: false,
      requestSettings: {
        ignoreImages: false,
        disableJavascript: false,
        userAgent: 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/534.34 (KHTML, like Gecko) Safari/534.34 PhantomJS/2.0.0 (PhantomJsCloud.com/2.0.1)',
        authentication: {
          userName: BASIC_AUTH_USER,
          password: BASIC_AUTH_PASS
        }
      },
    })
  })).buffer()
}
