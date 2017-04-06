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
  pledges: [Pledge!]!
  pledge(id: ID!): Pledge

  memberships: [Pledge]

  faqs(status: FaqStatus): [Faq]
}

type RootMutation {
  signIn(email: String!): SignInResponse!
  signOut: Boolean!

  submitPledge(pledge: PledgeInput): Pledge!
  payPledge(pledgePayment: PledgePaymentInput): Pledge!
  reclaimPledge(pledgeClaim: PledgeClaimInput): Pledge!

  updateAddress(address: AddressInput!): User!
  claimMembership(claimCode: String!): Membership

  submitQuestion(question: String!): MutationResult
}

type MutationResult {
  success: Boolean!
}

type SignInResponse {
  phrase: String!
}


type User {
  id: ID!
  name: String
  email: String!
  address: Address
  birthday: String
  roles: [Role]
  createdAt: Date!
  updatedAt: Date!

  pledges: [Pledge!]!
  memberships: [Membership!]!
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
  minUserPrice: Int!
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

type Membership {
  id: ID!
  type: MembershipType!
  startDate: Date
  pledge: Pledge!
  user: User!
  claimCode: String
  createdAt: Date!
  updatedAt: Date!
}

union Reward = Goodie | MembershipType

type Address {
  name: String
  line1: String!
  line2: String
  postalCode: String!
  city: String!
  country: String!
}

input UserInput {
  email: String!
  name: String!
}
input AddressInput {
  name: String!
  line1: String!
  line2: String
  postalCode: String!
  city: String!
  country: String!
}

enum PledgeStatus {
  DRAFT
  WAITING_FOR_PAYMENT
  SUCCESSFULL
  CANCELLED
}
type Pledge {
  id: ID!
  package: Package!
  options: [PackageOption!]!
  status: PledgeStatus!
  total: Int!
  donation: Int!
  payments: [PledgePayment!]!
  user: User!
  reason: String
  createdAt: Date!
  updatedAt: Date!
}

input PledgeInput {
  options: [PackageOptionInput!]!
  total: Int!
  user: UserInput
  reason: String
}


input PledgePaymentInput {
  pledgeId: ID!
  method: PaymentMethod!
  sourceId: String
  pspPayload: String
}

enum PaymentMethod {
  STRIPE
  POSTFINANCECARD
  PAYPAL
  PAYMENTSLIP
}
enum PaymentStatus {
  WAITING
  PAID
  REFUNDED
  CANCELLED
}
type PledgePayment {
  id: ID!
  pledge: Pledge!
  method: PaymentMethod!
  total: Int!
  status: PaymentStatus!
  createdAt: Date!
  updatedAt: Date!
}

input PledgeClaimInput {
  pledgeId: ID!
  email: String!
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
