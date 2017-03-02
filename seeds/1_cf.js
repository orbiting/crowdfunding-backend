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
    name: "all or nothing",
    beginDate: new Date("2017-02-13T17:28:14.740Z"),
    endDate: new Date("2017-03-13T23:59:59.000Z"),
    goalPeople: 3000,
    goalMoney: 75000000,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  crowdfundingId = parseInt(crowdfundingId)

  ///////////////////////////////////////////////////////////

  let rewardPosterId = await knex('rewards').insert({
    type: "Goodie",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  rewardPosterId = parseInt(rewardPosterId)

  let goodiePosterId = await knex('goodies').insert({
    rewardId: rewardPosterId,
    rewardType: "Goodie",
    name: "poster",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  goodiePosterId = parseInt(goodiePosterId)


  let rewardLetterId = await knex('rewards').insert({
    type: "Goodie",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  rewardLetterId = parseInt(rewardLetterId)

  let goodieLetterId = await knex('goodies').insert({
    rewardId: rewardLetterId,
    rewardType: "Goodie",
    name: "letter",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  goodieLetterId = parseInt(goodieLetterId)


  let rewardMembership0Id = await knex('rewards').insert({
    type: "MembershipType",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  rewardMembership0Id = parseInt(rewardMembership0Id)

  let membershipType0Id = await knex('membershipTypes').insert({
    rewardId: rewardMembership0Id,
    rewardType: "MembershipType",
    name: "awesome 1 year membership",
    duration: 360,
    price: 24000,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  membershipType0Id = parseInt(membershipType0Id)

  ///////////////////////////////////////////////////////////

  let package0Id = await knex('packages').insert({
    name: "no satisfaction",
    crowdfundingId: crowdfundingId,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  package0Id = parseInt(package0Id)

  let package0Option0Id = await knex('packageOptions').insert({
    packageId: package0Id,
    rewardId: rewardLetterId,
    minAmount: 1,
    maxAmount: 1,
    defaultAmount: 1,
    price: 7000,
    userPrice: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  package0Option0Id = parseInt(package0Option0Id)


  let package1Id = await knex('packages').insert({
    name: "feel good",
    crowdfundingId: crowdfundingId,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  package1Id = parseInt(package1Id)

  let package1Option0Id = await knex('packageOptions').insert({
    packageId: package1Id,
    rewardId: rewardPosterId,
    minAmount: 1,
    maxAmount: 20,
    defaultAmount: 1,
    price: 2000,
    userPrice: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  package1Option0Id = parseInt(package1Option0Id)

  let package1Option1Id = await knex('packageOptions').insert({
    packageId: package1Id,
    rewardId: rewardMembership0Id,
    minAmount: 1,
    maxAmount: 20,
    defaultAmount: 1,
    price: 22000,
    userPrice: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  package1Option1Id = parseInt(package1Option1Id)


  let package2Id = await knex('packages').insert({
    name: "buy one give n",
    crowdfundingId: crowdfundingId,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  package2Id = parseInt(package2Id)

  let package2Option0Id = await knex('packageOptions').insert({
    packageId: package2Id,
    rewardId: rewardMembership0Id,
    minAmount: 1,
    maxAmount: 1,
    defaultAmount: 1,
    price: 24000,
    userPrice: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  package2Option0Id = parseInt(package2Option0Id)

  let package2Option1Id = await knex('packageOptions').insert({
    packageId: package2Id,
    rewardId: rewardMembership0Id,
    minAmount: 1,
    maxAmount: 20,
    defaultAmount: 1,
    price: 24000,
    userPrice: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  package2Option1Id = parseInt(package2Option1Id)

  ///////////////////////////////////////////////////////////

  let user0 = await knex('users').where('email', 'patrick.recher@project-r.construction')
  user0 = user0[0]

  let pledge0Id = await knex('pledges').insert({
    packageId: package0Id,
    userId: user0.id,
    status: 'DRAFT',
    total: 7000,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning('id')
  pledge0Id = parseInt(pledge0Id)

  let pledge0Option0Id = await knex('pledgeOptions').insert({
    templateId: package0Option0Id,
    pledgeId: pledge0Id,
    amount: 1,
    price: 7000,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  pledge0Option0Id = parseInt(pledge0Option0Id)

}
