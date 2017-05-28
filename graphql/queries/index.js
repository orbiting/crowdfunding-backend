const fs = require("fs")

fs.readdirSync(__dirname).forEach(function(file) {
  if(file !== 'index.js' && !fs.lstatSync(__dirname+'/'+file).isDirectory()) {
    module.exports[file.split('.')[0]] = require('./'+file)
  }
})
