exports.seed = async function(knex, Promise) {
  await knex('pledgeOptions').del()
  await knex('pledges').del()
  await knex('packageOptions').del()
  await knex('packages').del()
  await knex('membershipTypes').del()
  await knex('goodies').del()
  await knex('rewards').del()
  await knex('crowdfundings').del()

  let crowdfundingId = await knex('crowdfundings').insert({
    name: "REPUBLIK",
    beginDate: new Date("2017-04-26T06:00:00.000Z"),
    endDate: new Date("2017-05-31T23:59:59.999Z"),
    goalPeople: 3000,
    goalMoney: 75000000,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  crowdfundingId = crowdfundingId[0]

  ///////////////////////////////////////////////////////////

  // let rewardPosterId = await knex('rewards').insert({
  //   type: "Goodie",
  //   createdAt: new Date(),
  //   updatedAt: new Date()
  // }).returning('id')
  // rewardPosterId = rewardPosterId[0]

  // let goodiePosterId = await knex('goodies').insert({
  //   rewardId: rewardPosterId,
  //   rewardType: "Goodie",
  //   name: "POSTER",
  //   createdAt: new Date(),
  //   updatedAt: new Date()
  // }).returning('id')
  // goodiePosterId = goodiePosterId[0]


  let rewardNoteBookId = await knex('rewards').insert({
    type: "Goodie",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  rewardNoteBookId = rewardNoteBookId[0]

  let goodieNoteBookId = await knex('goodies').insert({
    rewardId: rewardNoteBookId,
    rewardType: "Goodie",
    name: "NOTEBOOK",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  goodieNoteBookId = goodieNoteBookId[0]


  let rewardMembershipRegularId = await knex('rewards').insert({
    type: "MembershipType",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  rewardMembershipRegularId = rewardMembershipRegularId[0]

  let membershipTypeRegularId = await knex('membershipTypes').insert({
    rewardId: rewardMembershipRegularId,
    rewardType: "MembershipType",
    name: "ABO",
    duration: 365 + 364 / 2,
    price: 24000,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  membershipTypeRegularId = membershipTypeRegularId[0]


  let rewardMembershipBenefactorId = await knex('rewards').insert({
    type: "MembershipType",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  rewardMembershipBenefactorId = rewardMembershipBenefactorId[0]

  let membershipTypeBenefactorId = await knex('membershipTypes').insert({
    rewardId: rewardMembershipBenefactorId,
    rewardType: "MembershipType",
    name: "BENEFACTOR_ABO",
    duration: 365 + 364 / 2,
    price: 24000,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  membershipTypeBenefactorId = membershipTypeBenefactorId[0]

  ///////////////////////////////////////////////////////////

  // let packagePosterId = await knex('packages').insert({
  //   name: "POSTER",
  //   crowdfundingId: crowdfundingId,
  //   createdAt: new Date(),
  //   updatedAt: new Date()
  // }).returning('id')
  // packagePosterId = packagePosterId[0]

  // let packagePosterOptionId = await knex('packageOptions').insert({
  //   packageId: packagePosterId,
  //   rewardId: rewardNoteBookId,
  //   minAmount: 1,
  //   maxAmount: 1,
  //   defaultAmount: 1,
  //   price: 7000,
  //   userPrice: false,
  //   createdAt: new Date(),
  //   updatedAt: new Date()
  // }).returning('id')
  // packagePosterOptionId = packagePosterOptionId[0]


  let packageAboId = await knex('packages').insert({
    name: "ABO",
    crowdfundingId: crowdfundingId,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  packageAboId = packageAboId[0]

  let packageAboOptionAboId = await knex('packageOptions').insert({
    packageId: packageAboId,
    rewardId: rewardMembershipRegularId,
    minAmount: 1,
    maxAmount: 1,
    defaultAmount: 1,
    price: 24000,
    userPrice: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  packageAboOptionAboId = packageAboOptionAboId[0]


  let packageAboGiveId = await knex('packages').insert({
    name: "ABO_GIVE",
    crowdfundingId: crowdfundingId,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  packageAboGiveId = packageAboGiveId[0]

  let packageAboGiveOptionAboId = await knex('packageOptions').insert({
    packageId: packageAboGiveId,
    rewardId: rewardMembershipRegularId,
    minAmount: 1,
    maxAmount: 20,
    defaultAmount: 1,
    price: 24000,
    userPrice: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  packageAboGiveOptionAboId = packageAboGiveOptionAboId[0]

  let packageAboGiveOptionNoteBookId = await knex('packageOptions').insert({
    packageId: packageAboGiveId,
    rewardId: rewardNoteBookId,
    minAmount: 0,
    maxAmount: 20,
    defaultAmount: 0,
    price: 2000,
    userPrice: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  packageAboGiveOptionNoteBookId = packageAboGiveOptionNoteBookId[0]


  let packageBenefactorId = await knex('packages').insert({
    name: "BENEFACTOR",
    crowdfundingId: crowdfundingId,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  packageBenefactorId = packageBenefactorId[0]

  let packageBenefactorOptionBenefactorAboId = await knex('packageOptions').insert({
    packageId: packageBenefactorId,
    rewardId: rewardMembershipBenefactorId,
    minAmount: 1,
    maxAmount: 1,
    defaultAmount: 1,
    price: 100000,
    userPrice: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  packageBenefactorOptionBenefactorAboId = packageBenefactorOptionBenefactorAboId[0]


  let packageDonateId = await knex('packages').insert({
    name: "DONATE",
    crowdfundingId: crowdfundingId,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  packageDonateId = packageDonateId[0]

  let packageDonateOptionId = await knex('packageOptions').insert({
    packageId: packageDonateId,
    minAmount: 1,
    maxAmount: 1,
    defaultAmount: 1,
    price: 0,
    userPrice: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  packageDonateOptionId = packageDonateOptionId[0]

}
