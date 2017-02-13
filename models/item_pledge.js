const bookshelf = require('../bookshelf')
require('./item')
require('./pledge')

const ItemPledge = bookshelf.Model.extend({
  tableName: 'items_pledges',
  pledge: function() {
    return this.belongsTo('Pledge')
  },
  item: function() {
    return this.belongsTo('Item')
  }
})

module.exports = bookshelf.model('ItemPledge', ItemPledge)
