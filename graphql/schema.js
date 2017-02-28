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

  crowdfundings(ids: [Int]): [Crowdfunding]
  pledges(id: Int, user_id: Int): [Pledge]

  packages: [Package]
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
  createdAt: String
  updatedAt: String
}

type Package {
  id: ID!
  name: String!
  options: [PackageOption!]!

  templateId: ID
}
type PackageOption {
  id: ID!
  package: Package!
  reward: Reward!
  minAmount: Int!
  maxAmount: Int
  defaultAmount: Int!
  price: Int!
  userPrice: Boolean!

  amount: Int
  templateId: ID
}
type Goodie {
  id: ID!
  name: String
}
type MembershipType {
  id: ID!
  name: String
  duration: Int
}
union Reward = Goodie | MembershipType

enum PledgeStatus {
  DRAFT
  PAID
  REFUNDED
}

type Pledge {
  id: ID!
  crowdfunding: Crowdfunding!
  status: PledgeStatus!
  package: Package!
  total: Int!
  payments: [PledgePayment!]!
  user: User!
}


type PledgePayment {
  id: ID!
  user: User!
  pledge: Pledge!
  total: Int!
  status: String
}
`

module.exports = [typeDefinitions]
