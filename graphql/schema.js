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

  faqs: [Faq!]!
  events: [Event!]!
  updates: [Update!]!
  testimonials(offset: Int, limit: Int, seed: Float, search: String, firstId: ID, videosOnly: Boolean): [Testimonial!]!

  membershipStats: MembershipStats!
  testimonialStats: TestimonialStats!
  paymentStats: PaymentStats!

  feeds: [Feed!]!
  feed(name: String!, offset: Int, limit: Int): Feed!

  votings: [Voting!]!
  voting(name: String!): Voting!
}

type RootMutation {
  signIn(email: String!, context: String): SignInResponse!
  signOut: Boolean!
  updateMe(firstName: String, lastName: String, birthday: Date, phoneNumber: String, address: AddressInput): User!

  submitPledge(pledge: PledgeInput): PledgeResponse!
  payPledge(pledgePayment: PledgePaymentInput): PledgeResponse!
  reclaimPledge(pledgeId: ID!): Boolean!
  claimMembership(voucherCode: String!): Boolean!

  remindEmail(email: String!): Boolean!
  submitQuestion(question: String!): MutationResult

  submitTestimonial(role: String, quote: String!, image: String): Testimonial!
  unpublishTestimonial: Boolean

  submitComment(feedName: String!, content: String!, tags: [String!]): Boolean
  upvoteComment(commentId: ID!): Boolean
  downvoteComment(commentId: ID!): Boolean
  editComment(commentId: ID!, content: String!): Boolean
  unpublishComment(commentId: ID!): Boolean

  submitBallot(optionId: ID!): Boolean!
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
  firstName: String
  lastName: String
  email: String!
  address: Address
  birthday: Date
  phoneNumber: String
  createdAt: DateTime!
  updatedAt: DateTime!

  pledges: [Pledge!]!
  memberships: [Membership!]!
  testimonial: Testimonial
}


type Crowdfunding {
  id: ID!
  name: String!
  beginDate: DateTime!
  endDate: DateTime!
  goals: [CrowdfundingGoal!]!
  status: CrowdfundingStatus!
  packages: [Package!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}
type CrowdfundingGoal {
  money: Int!
  people: Int!
  description: String
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
  claimerName: String
  sequenceNumber: Int
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
  firstName: String!
  lastName: String!
  birthday: Date
  phoneNumber: String
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
  pfAliasId: String
  pfSHA: String
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

type Faq {
  category: String
  question: String
  answer: String
}
type Event {
  slug: String
  title: String
  description: String
  link: String
  date: Date
  time: String
  where: String
  locationLink: String
  metaDescription: String
  socialMediaImage: String
}
type Update {
  slug: String
  title: String
  text: String
  publishedDateTime: DateTime
  metaDescription: String
  socialMediaImage: String
}

enum ImageSize {
  SHARE
}

type Testimonial {
  id: ID!
  name: String!
  role: String
  quote: String
  video: Video
  # 384x384 JPEG HTTPS URL
  image(size: ImageSize): String!
  smImage: String
  published: Boolean
  adminUnpublished: Boolean
  sequenceNumber: Int
}

type Video {
  hls: String!
  mp4: String!
  youtube: String
  subtitles: String
}


type MembershipStats {
  createdAts(interval: TimeInterval!): [TimeCount!]!
  ages: [AgeCount!]!
  countries: [CountryCount!]!
}

enum TimeInterval {
  hour
  day
  week
  month
  quarter
  year
}

type TimeCount {
  datetime: DateTime!
  count: Int!
}
type AgeCount {
  age: Int
  count: Int!
}
type CountryCount {
  name: String
  count: Int!
  states: [StateCount!]!
  postalCodes: [PostalCodeCount!]!
}
type StateCount {
  name: String
  abbr: String
  count: Int!
}
type PostalCodeCount {
  postalCode: String
  name: String
  lat: Float!
  lon: Float!
  count: Int!
}


type TestimonialStats {
  count: Int!
}


type PaymentStats {
  paymentMethods: [PaymentMethodCount!]!
}

type PaymentMethodCount {
  method: PaymentMethod!
  count: Int!
  details: [DetailCount!]!
}
type DetailCount {
  detail: String
  count: Int!
}


type Feed {
  id: ID!
  name: String!
  # comments in this feed in natual order
  comments(offset: Int, limit: Int, firstId: ID): [Comment!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  userIsEligitable: Boolean!
  # user must wait until that date to submit a new comment
  userWaitUntil: DateTime
  # max length in chars of comment content
  commentMaxLength: Int!
  # waiting time to submit a new comment (in milliseconds)
  commentInterval: Int!
}
enum CommentVote {
  UP
  DOWN
}
type Comment {
  id: ID!
  content: String!
  tags: [String!]!
  authorName: String!
  authorImage(size: ImageSize): String
  smImage: String
  upVotes: Int!
  downVotes: Int!
  # score based on votes
  score: Int!
  # reddit's hottnes
  hottnes: Float!
  # vote of the signedIn user (null - no vote)
  userVote: CommentVote
  userCanEdit: Boolean
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Voting {
  id: ID!
  name: String!
  beginDate: DateTime!
  endDate: DateTime!
  options: [VoteOption!]!
  turnout: VoteTurnout!
  result: VoteResult
  # current user (me) is eligitable to submit a ballot
  userIsEligitable: Boolean
  # current user (me) has submitted a ballot
  userHasSubmitted: Boolean
}
type VoteTurnout {
  eligitable: Int!
  submitted: Int!
}
type VoteOption {
  id: ID!
  name: String!
}
type VoteOptionResult {
  id: ID!
  name: String!
  count: Int!
  winner: Boolean
}
type VoteResult {
  options: [VoteOptionResult!]!
  message: String
  createdAt: DateTime
  updatedAt: DateTime
}

`
module.exports = [typeDefinitions]
