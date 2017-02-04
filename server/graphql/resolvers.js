import { User, Role } from './connectors'

const resolveFunctions = {
  RootQuery: {
    users(_, args) {
      return User.findAll({ where: args })
    },
    roles(_, args) {
      return Role.findAll({ where: args })
    }
  },
  User: {
    roles(user) {
      return user.getRoles()
    }
  },
  Role: {
    users(role) {
      return role.getUsers()
    }
  }
}

module.exports = resolveFunctions
