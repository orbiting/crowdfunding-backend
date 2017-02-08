exports.seed = function(knex, Promise) {
  return knex('users').del()
  .then( () => {
    return knex('roles').insert({
      name: "admin",
      description: "admins are kind",
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id')
  }).then( (roleId) => {
    return knex('users').insert({
      email: 'patrick.recher@project-r.construction',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id')
    .then( (userId) => {
      return knex('roles_users').insert({
        'user_id': parseInt(userId),
        'role_id': parseInt(roleId),
        created_at: new Date(),
        updated_at: new Date()

      })
    })
  })
}
