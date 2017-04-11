const winston = require('winston')

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: true,
      level: 'verbose',
      colorize: true,
      json: !(process.env.NODE_ENV && process.env.NODE_ENV !== 'production')
    })
  ]
})

module.exports = logger
