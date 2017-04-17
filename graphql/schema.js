const typeDefinitions = `
scalar Date
scalar DateTime

schema {
  query: RootQuery
  mutation: RootMutation
}

type RootQuery {
  me: User

  crowdfundings: [Crowdfunding]
  crowdfunding(name: String!): Crowdfunding!
  pledges: [Pledge!]!
  pledge(id: ID!): Pledge
  draftPledge(id: ID!): Pledge!

  memberships: [Pledge]

  faqs(status: FaqStatus): [Faq]
}

type RootMutation {
  signIn(email: String!): SignInResponse!
  signOut: Boolean!
  updateMe(user: UserInput!, address: AddressInput!): User!

  submitPledge(pledge: PledgeInput): PledgeResponse!
  payPledge(pledgePayment: PledgePaymentInput): PledgeResponse!
  reclaimPledge(pledgeClaim: PledgeClaimInput): PledgeResponse!
  claimMembership(voucherCode: String!): Boolean!

  remindEmail(email: String!): Boolean!
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
  birthday: Date
  createdAt: DateTime!
  updatedAt: DateTime!

  pledges: [Pledge!]!
  memberships: [Membership!]!
}


type Crowdfunding {
  id: ID!
  name: String!
  beginDate: DateTime!
  endDate: DateTime!
  goal: CrowdfundingGoal!
  status: CrowdfundingStatus!
  packages: [Package!]!
  createdAt: DateTime!
  updatedAt: DateTime!
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
  createdAt: DateTime!
  updatedAt: DateTime!
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
  createdAt: DateTime!
  updatedAt: DateTime!

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
  createdAt: DateTime!
  updatedAt: DateTime!
}

type MembershipType {
  id: ID!
  name: String!
  duration: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Membership {
  id: ID!
  type: MembershipType!
  startDate: DateTime
  pledge: Pledge!
  voucherCode: String
  reducedPrice: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
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
  birthday: Date
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
  PAID_INVESTIGATE
  SUCCESSFUL
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
  memberships: [Membership!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input PledgeInput {
  options: [PackageOptionInput!]!
  total: Int!
  user: UserInput!
  reason: String
}

type PledgeResponse {
  pledgeId: ID
  userId: ID
  emailVerify: Boolean
}

input PledgePaymentInput {
  pledgeId: ID!
  method: PaymentMethod!
  paperInvoice: Boolean
  sourceId: String
  pspPayload: String
  address: AddressInput
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
  method: PaymentMethod!
  paperInvoice: Boolean!
  total: Int!
  status: PaymentStatus!
  hrid: String
  dueDate: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
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
  createdAt: DateTime!
  updatedAt: DateTime!
}
`
module.exports = [typeDefinitions]
