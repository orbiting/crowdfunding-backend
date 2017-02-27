exports.seed = async function(knex, Promise) {
  await knex('cf.users_roles').del()
  await knex('cf.roles').del()
  await knex('cf.users').del()

  let adminsId = await knex('cf.roles').insert({
    name: "admin",
    description: "admins are kind",
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  adminsId = parseInt(adminsId)

  let userId = await knex('cf.users').insert({
    email: 'patrick.recher@project-r.construction',
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id')
  userId = parseInt(userId)

  await knex('cf.users_roles').insert({
    user_id: userId,
    role_id: adminsId,
    created_at: new Date(),
    updated_at: new Date()
  })
}
