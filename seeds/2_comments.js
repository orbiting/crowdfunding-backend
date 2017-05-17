exports.seed = async function(knex, Promise) {
  await knex('comments').del()
  await knex('feeds').del()

  await knex('feeds').insert({
    name: "END_GOAL",
    commentMaxLength: 300,
    commentInterval: 24*60*60*1000,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  await knex('feeds').insert({
    name: "CHAT",
    commentMaxLength: 300,
    commentInterval: 1000,
    createdAt: new Date(),
    updatedAt: new Date()
  })

}
