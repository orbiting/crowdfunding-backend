exports.up = function(knex) {
  return knex.schema
    .createTable('users', function(table) {
      table.increments('id').primary()
      table.string('email')
      table.timestamps()
    }).then( function() {
      return knex.schema.createTable('roles', function(table) {
        table.increments('id').primary()
        table.string('name')
        table.string('description')
        table.timestamps()
      }).then( function() {
        return knex.schema.createTable('roles_users', function(table) {
          table.increments('id').primary()
          table.integer('user_id').references('id').inTable('users').onUpdate('CASCADE').onDelete('CASCADE')
          table.integer('role_id').references('id').inTable('roles').onUpdate('CASCADE').onDelete('CASCADE')
          table.timestamps()
        })
      })
    }).then(function() {
      console.log("migration done!")
    }).catch(function(error) {
      console.log("migration error:")
      console.log(error)
    })
}

exports.down = function(knex) {
  return knex.schema
    .dropTable('users_roles')
    .dropTable('users')
    .dropTable('roles')
}
