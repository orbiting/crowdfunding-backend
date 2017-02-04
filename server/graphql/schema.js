const typeDefinitions = `
type User {
  id: Int
  name: String
  email: String
  roles: [Role]
  createdAt: String
}
type Role {
  id: Int
  name: String
  description: String
  users: [User]
}

type RootQuery {
  roles(limit: Int = 50, page: Int = 0): [Role]
  users(id: Int, email: String): [User]
  user(id: Int, email: String): User
}

schema {
  query: RootQuery
}
`

module.exports = [typeDefinitions]
