const bookshelf = require('../bookshelf')
require('./item')

const Crowdfunding = bookshelf.Model.extend({
  tableName: 'crowdfundings',
  items: function() {
    return this.hasMany('Item')
  }
})

module.exports = bookshelf.model('Crowdfunding', Crowdfunding)
