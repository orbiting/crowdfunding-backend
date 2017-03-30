const typeDefinitions = `
scalar Date

schema {
  query: RootQuery
  mutation: RootMutation
}

type RootQuery {
  me: User
  roles(id: ID): [Role]
  users(id: ID, email: String): [User]

  crowdfundings: [Crowdfunding]
  crowdfunding(name: String!): Crowdfunding!
  pledges: [Pledge]

  checkEmail(email: String!): CheckMailResult!

  faqs(status: FaqStatus): [Faq]
}

type RootMutation {
  signIn(email: String!): SignInResponse!
  signOut: Boolean!
  submitPledge(pledge: PledgeInput): Pledge
  submitQuestion(question: String!): MutationResult
}

type MutationResult {
  success: Boolean!
}

type SignInResponse {
  phrase: String!
}

type CheckMailResult {
  free: Boolean!
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
  goal: CrowdfundingGoal!
  status: CrowdfundingStatus!
  packages: [Package!]!
  createdAt: Date!
  updatedAt: Date!
}
type CrowdfundingGoal {
  money: Int!
  people: Int!
}
type CrowdfundingStatus {
  money: Int!
  people: Int!
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
  PAYED
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
  user: PledgeUserInput
  payment: PledgePaymentInput!
}
input PledgeUserInput {
  email: String!
  name: String!
}
input PledgePaymentInput {
  method: PaymentMethod!
  stripeSourceId: String
}

enum PaymentMethod {
  VISA
  MASTERCARD
  PFC
  EZS
}
type PledgePayment {
  id: ID!
  pledge: Pledge!
  method: PaymentMethod!
  total: Int!
  status: String
  createdAt: Date!
  updatedAt: Date!
}

enum FaqStatus {
  DRAFT
  PUBLISHED
}

type Faq {
  id: ID!
  status: FaqStatus!
  question: String!
  answer: String!
  createdAt: Date!
  updatedAt: Date!
}
`
module.exports = [typeDefinitions]
