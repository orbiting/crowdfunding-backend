require('dotenv').config()
require('babel-core/register')
require("babel-polyfill")
module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  debug: (process.env.NODE_ENV!=='production')
}
