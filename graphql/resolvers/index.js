const fs = require('fs')

fs.readdirSync(__dirname).forEach((file) => {
  if (file !== 'index.js') {
    if (fs.lstatSync(__dirname + '/' + file).isDirectory()) {
      module.exports[file] = require('./' + file + '/index')
    } else {
      module.exports[file.split('.')[0]] = require('./' + file)
    }
  }
})
