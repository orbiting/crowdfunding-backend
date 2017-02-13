const bookshelf = require('../bookshelf')
require('./user')
require('./item_pledge')

const Pledge = bookshelf.Model.extend({
  tableName: 'pledges',
  user: function() {
    return this.belongsTo('User')
  },
  itemPledges: function() {
    return this.hasMany('ItemPledge')
  }
})

module.exports = bookshelf.model('Pledge', Pledge)
