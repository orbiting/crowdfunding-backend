const winston = require('winston')
const util = require('util')

const logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      level: 'verbose',
      colorize: true,
      json: !(process.env.NODE_ENV && process.env.NODE_ENV !== 'production'),
      stringify: (obj) => JSON.stringify(obj)
    })
  ],
  rewriters: [
    (level, msg, meta) => {
      //only the important things in development
      if(process.env.NODE_ENV !== 'production') {
        const result = {}
        if(meta.error)
          result.error = util.inspect(meta.error)
        if(meta.e)
          result.e = util.inspect(meta.e)
        if(meta.req && meta.req.body)
          result.body = meta.req.body
        return result
      }
      return meta
    }
  ]
})

module.exports = logger
