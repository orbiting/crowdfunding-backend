const bookshelf = require('../bookshelf')
require('./user')

const Role = bookshelf.Model.extend({
  tableName: 'roles',
  users: function() {
    return this.belongsToMany('User')
  }
})

module.exports = bookshelf.model('Role', Role)
