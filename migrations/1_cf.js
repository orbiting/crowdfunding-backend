
exports.up = function(knex) {
  return Promise.resolve(true).then( function() {
    return knex.schema.createTable('crowdfundings', function(table) {
      table.increments('id').primary()
      table.string('name')
      table.date('begin_date')
      table.date('end_date')
      table.integer('goal_people')
      table.integer('goal_money')
      table.timestamps()
    })
  }).then( function() {
    return knex.schema.createTable('items', function(table) {
      table.increments('id').primary()
      table.string('name')
      table.string('description')
      table.integer('price')
      table.integer('crowdfunding_id').references('id').inTable('crowdfundings')
        .onUpdate('CASCADE').onDelete('CASCADE').notNullable()
      table.timestamps()
    })
  }).then( function() {
    return knex.schema.createTable('pledges', function(table) {
      table.increments('id').primary()
      table.integer('crowdfunding_id').references('id').inTable('crowdfundings')
        .onUpdate('CASCADE').onDelete('CASCADE').notNullable()
      table.integer('user_id').references('id').inTable('users')
        .onUpdate('CASCADE').onDelete('CASCADE').notNullable()
      table.integer('brutto')
      table.boolean('payed')
      table.timestamps()
    })
  }).then( function() {
    return knex.schema.createTable('items_pledges', function(table) {
      table.increments('id').primary()
      table.integer('item_id').references('id').inTable('items')
        .onUpdate('CASCADE').onDelete('CASCADE').notNullable()
      table.integer('pledge_id').references('id').inTable('pledges')
        .onUpdate('CASCADE').onDelete('CASCADE').notNullable()
      table.integer('num_items')
      table.timestamps()
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
    .dropTable('items_pledges')
    .dropTable('pledges')
    .dropTable('items')
    .dropTable('crowdfundings')
}
