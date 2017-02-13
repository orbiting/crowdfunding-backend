const bookshelf = require('../bookshelf')
require('./crowdfunding')
require('./item_pledge')

const Item = bookshelf.Model.extend({
  tableName: 'items',
  crowdfunding: function() {
    return this.belongsTo('Crowdfunding')
  },
  itemPledges: function() {
    return this.hasMany('ItemPledge')
  }
})

module.exports = bookshelf.model('Item', Item)
