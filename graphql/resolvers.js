import User from '../models/user'

const resolveFunctions = {
  RootQuery: {
    users(_, args, context, info) {
      return User.where(args).fetchAll().then( users => {
        return users.toJSON()
      })
    },
    roles(_, args) {
      return Role.where(args).fetchAll().then( roles => {
        return roles.toJSON()
      })
    }
  },
  User: {
    roles(user) {
      return User.where({id: user.id}).fetch({withRelated: ['roles']}).then( user => {
        return user.related('roles').toJSON()
      })
    }
  },
  Role: {
    users(role) {
      return Role.where({id: role.id}).fetch({withRelated: ['users']}).then( role => {
        return role.related('users').toJSON()
      })
    }
  }
}

module.exports = resolveFunctions
