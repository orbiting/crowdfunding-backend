const crypto = require('crypto')

module.exports = (list, email) => {
  return crypto
    .createHash('sha256')
    .update(list + email + process.env.SUBSCRIBE_SECRET)
    .digest('hex')
}
