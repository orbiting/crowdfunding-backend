const typeDefinitions = `
scalar Date

schema {
  query: RootQuery
  mutation: RootMutation
}

type RootQuery {
  roles(id: ID): [Role]
  users(id: ID, email: String): [User]

  crowdfundings: [Crowdfunding]
  crowdfunding(name: String!): Crowdfunding!
  pledges: [Pledge]
}

type RootMutation {
  submitPledge(pledge: PledgeInput): Pledge
}


type User {
  id: ID!
  name: String
  email: String!
  roles: [Role]
  createdAt: Date!
  updatedAt: Date!
}

type Role {
  id: ID!
  name: String
  description: String
  users: [User]
  createdAt: Date!
  updatedAt: Date!
}


type Crowdfunding {
  id: ID!
  name: String!
  beginDate: Date!
  endDate: Date!
  goalPeople: Int!
  goalMoney: Int!
  packages: [Package!]!
  createdAt: Date!
  updatedAt: Date!
}

type Package {
  id: ID!
  name: String!
  options: [PackageOption!]!
  createdAt: Date!
  updatedAt: Date!
}

type PackageOption {
  id: ID!
  package: Package!
  reward: Reward
  minAmount: Int!
  maxAmount: Int
  defaultAmount: Int!
  price: Int!
  userPrice: Boolean!
  createdAt: Date!
  updatedAt: Date!

  amount: Int
  templateId: ID
}
input PackageOptionInput {
  amount: Int!
  price: Int!
  templateId: ID!
}

type Goodie {
  id: ID!
  name: String!
  createdAt: Date!
  updatedAt: Date!
}

type MembershipType {
  id: ID!
  name: String!
  duration: Int!
  createdAt: Date!
  updatedAt: Date!
}

union Reward = Goodie | MembershipType

enum PledgeStatus {
  DRAFT
  PAID
  REFUNDED
}
type Pledge {
  id: ID!
  packageId: ID!
  crowdfunding: Crowdfunding!
  status: PledgeStatus!
  options: [PackageOption!]!
  total: Int!
  payments: [PledgePayment]
  user: User!
  createdAt: Date!
  updatedAt: Date!
}
input PledgeInput {
  options: [PackageOptionInput!]!
  total: Int!
}

type PledgePayment {
  id: ID!
  user: User!
  pledge: Pledge!
  total: Int!
  status: String
  createdAt: Date!
  updatedAt: Date!
}
`
module.exports = [typeDefinitions]
