require('dotenv').config()
module.exports = {
  client: 'pg',
  connection: process.env.USERS_DB_URL,
  debug: (process.env.NODE_ENV!=='production')
}
