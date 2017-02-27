exports.seed = async function(knex, Promise) {
  await knex('cf.pledge_options').del()
  await knex('cf.pledges').del()
  await knex('cf.package_options').del()
  await knex('cf.packages').del()
  await knex('cf.membership_types').del()
  await knex('cf.goodies').del()
  await knex('cf.rewards').del()
  await knex('cf.crowdfundings').del()

  let crowdfundingId = await knex('cf.crowdfundings').insert({
    name: "all or nothing",
    begin_date: new Date("2017-02-13T17:28:14.740Z"),
    end_date: new Date("2017-03-13T23:59:59.000Z"),
    goal_people: 3000,
    goal_money: 75000000,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  crowdfundingId = parseInt(crowdfundingId)

  ///////////////////////////////////////////////////////////

  let rewardPosterId = await knex('cf.rewards').insert({
    type: "GOODIE",
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  rewardPosterId = parseInt(rewardPosterId)

  let goodiePosterId = await knex('cf.goodies').insert({
    reward_id: rewardPosterId,
    reward_type: "GOODIE",
    name: "poster",
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  goodiePosterId = parseInt(goodiePosterId)


  let rewardLetterId = await knex('cf.rewards').insert({
    type: "GOODIE",
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  rewardLetterId = parseInt(rewardLetterId)

  let goodieLetterId = await knex('cf.goodies').insert({
    reward_id: rewardLetterId,
    reward_type: "GOODIE",
    name: "letter",
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  goodieLetterId = parseInt(goodieLetterId)


  let rewardMembership0Id = await knex('cf.rewards').insert({
    type: "MEMBERSHIP",
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  rewardMembership0Id = parseInt(rewardMembership0Id)

  let membershipType0Id = await knex('cf.membership_types').insert({
    reward_id: rewardMembership0Id,
    reward_type: "MEMBERSHIP",
    name: "awesome 1 year membership",
    duration: 360,
    price: 24000,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  membershipType0Id = parseInt(membershipType0Id)

  ///////////////////////////////////////////////////////////

  let package0Id = await knex('cf.packages').insert({
    name: "no satisfaction",
    crowdfunding_id: crowdfundingId,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  package0Id = parseInt(package0Id)

  let package0Option0Id = await knex('cf.package_options').insert({
    package_id: package0Id,
    reward_id: rewardLetterId,
    min_amount: 1,
    max_amount: 1,
    default_amount: 1,
    price: 7000,
    user_price: false,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  package0Option0Id = parseInt(package0Option0Id)


  let package1Id = await knex('cf.packages').insert({
    name: "feel good",
    crowdfunding_id: crowdfundingId,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  package1Id = parseInt(package1Id)

  let package1Option0Id = await knex('cf.package_options').insert({
    package_id: package0Id,
    reward_id: rewardPosterId,
    min_amount: 1,
    max_amount: 20,
    default_amount: 1,
    price: 2000,
    user_price: false,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  package1Option0Id = parseInt(package1Option0Id)

  let package1Option1Id = await knex('cf.package_options').insert({
    package_id: package0Id,
    reward_id: rewardMembership0Id,
    min_amount: 1,
    max_amount: 20,
    default_amount: 1,
    price: 22000,
    user_price: true,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  package1Option1Id = parseInt(package1Option1Id)


  let package2Id = await knex('cf.packages').insert({
    name: "buy one give n",
    crowdfunding_id: crowdfundingId,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  package2Id = parseInt(package2Id)

  let package2Option0Id = await knex('cf.package_options').insert({
    package_id: package0Id,
    reward_id: rewardMembership0Id,
    min_amount: 1,
    max_amount: 1,
    default_amount: 1,
    price: 24000,
    user_price: false,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  package2Option0Id = parseInt(package2Option0Id)

  let package2Option1Id = await knex('cf.package_options').insert({
    package_id: package0Id,
    reward_id: rewardMembership0Id,
    min_amount: 1,
    max_amount: 20,
    default_amount: 1,
    price: 24000,
    user_price: false,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  package2Option1Id = parseInt(package2Option1Id)

  ///////////////////////////////////////////////////////////

  let user0 = await knex('cf.users').where('email', 'patrick.recher@project-r.construction')
  user0 = user0[0]

  let pledge0Id = await knex('cf.pledges').insert({
    package_id: package0Id,
    user_id: user0.id,
    status: 'DRAFT',
    total: 7000,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  pledge0Id = parseInt(pledge0Id)

  let pledge0Option0Id = await knex('cf.pledge_options').insert({
    template_id: package0Option0Id,
    pledge_id: pledge0Id,
    amount: 1,
    price: 7000,
    created_at: new Date(),
    updated_at: new Date()
  })
  pledge0Option0Id = parseInt(pledge0Option0Id)

}
