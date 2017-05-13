exports.seed = async function(knex, Promise) {
  await knex('comments').del()
  await knex('feeds').del()

  await knex('feeds').insert({
    name: "endGoal",
    commentMaxLength: 300,
    newCommentWaitingTime: 24*60*60*1000,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  await knex('feeds').insert({
    name: "chat",
    commentMaxLength: 300,
    newCommentWaitingTime: 1000,
    createdAt: new Date(),
    updatedAt: new Date()
  })

}
