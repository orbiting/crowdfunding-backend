exports.seed = async function(knex, Promise) {
  await knex('votings').del()

  let votingId = (await knex('votings').insert({
    name: "END_GOAL",
    beginDate: new Date(), //new Date("2017-05-22T05:00:00.000Z")
    endDate: new Date("2017-05-29T17:00:00.000Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning('id'))[0]

  await knex('votingOptions').insert({
    name: "DATA",
    votingId,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  await knex('votingOptions').insert({
    name: "CORRESPONDENT",
    votingId,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  await knex('votingOptions').insert({
    name: "SATIRE",
    votingId,
    createdAt: new Date(),
    updatedAt: new Date()
  })

}
