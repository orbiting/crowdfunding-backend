const typeDefinitions = `
scalar Date

schema {
  query: RootQuery
  mutation: RootMutation
}

type RootMutation {
  submitPledge(numItems: Int!): Pledge
}

type RootQuery {
  roles(id: Int): [Role]
  users(id: Int, email: String): [User]

  crowdfundings(id: Int): [Crowdfunding]
  pledges(id: Int, user_id: Int): [Pledge]
}

type User {
  id: Int
  name: String
  email: String
  roles: [Role]
  createdAt: String
  updatedAt: String
}
type Role {
  id: Int
  name: String
  description: String
  users: [User]
  createdAt: String
  updatedAt: String
}

type Crowdfunding {
  id: Int
  name: String
  beginDate: Date
  endDate: Date
  goalPeople: Int
  goalMoney: Int
  items: [Item]
  createdAt: String
  updatedAt: String
}
type Item {
  id: Int
  name: String
  description: String
  price: Int
  itemPledges: [ItemPledge]
  createdAt: String
  updatedAt: String
}
type ItemPledge {
  id: Int
  item: Item
  pledge: Pledge
  numItems: Int
}
type Pledge {
  id: Int
  user: User
  itemPledges: [ItemPledge]
  brutto: Int
  payed: Boolean
  createdAt: String
  updatedAt: String
}

`

module.exports = [typeDefinitions]
