const { PgDb } = require('pogi')
const {timeFormat, timeParse} = require('d3-time-format')

const parser = timeParse('%Y-%m-%d %H %Z')

const DEV = process.env.NODE_ENV && process.env.NODE_ENV !== 'production'

const connect = () => PgDb.connect({
  connectionString: process.env.DATABASE_URL,
  ssl: !DEV
})
  .then( async (pgdb) => {

    // custom date parser
    // parse db dates as 12:00 Zulu
    // this applies to dates only (not datetime)
    const dateParser = val => {
      const date = parser(val+' 12 Z')
      return date
    }
    await pgdb.setTypeParser('date', dateParser)

    return pgdb
  })

module.exports = {connect}
