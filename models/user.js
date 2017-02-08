const bookshelf = require('../bookshelf')
require('./role')

const User = bookshelf.Model.extend({
  tableName: 'users',
  roles: function() {
    return this.belongsToMany('Role')
  }
})

module.exports = bookshelf.model('User', User)
