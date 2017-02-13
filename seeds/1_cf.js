exports.seed = function(knex, Promise) {
  return Promise.all([
    knex('items_pledges').del(),
    knex('pledges').del(),
    knex('items').del(),
    knex('crowdfundings').del()
  ]).then( () => {
    return knex('crowdfundings').insert({
      name: "all or nothing",
      begin_date: new Date("2017-02-13T17:28:14.740Z"),
      end_date: new Date("2017-03-13T23:59:59.000Z"),
      goal_people: 3000,
      goal_money: 75000000,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id')
  }).then( (crowdfundingId) => {
    crowdfundingId = parseInt(crowdfundingId)
    return knex('users').where('email', 'patrick.recher@project-r.construction').select('id').then( (userId) => {
      userId = parseInt(userId[0].id)
      return knex('pledges').insert({
        crowdfunding_id: crowdfundingId,
        user_id: userId,
        brutto: 0,
        payed: false,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id').then( (pledgeId) => {
        pledgeId = parseInt(pledgeId)
        return Promise.all([
          knex('items').insert({
            crowdfunding_id: crowdfundingId,
            name: "one membership",
            description: "get one membership for yourself!",
            price: 20000,
            created_at: new Date(),
            updated_at: new Date()
          }).returning('id'),
          knex('items').insert({
            crowdfunding_id: crowdfundingId,
            name: "get one, give one",
            description: "give others a membership too!",
            price: 40000,
            created_at: new Date(),
            updated_at: new Date()
          }).returning('id')
        ]).then( (itemIds) => {
          itemIds = itemIds.map( (i) => { return parseInt(i[0]) } )
          return Promise.all([
            knex('items_pledges').insert({
              item_id: itemIds[0],
              pledge_id: pledgeId,
              num_items: 1,
              created_at: new Date(),
              updated_at: new Date()
            }),
            knex('items_pledges').insert({
              item_id: itemIds[1],
              pledge_id: pledgeId,
              num_items: 2,
              created_at: new Date(),
              updated_at: new Date()
            })
          ])
        })
      })
    })
  })
}
