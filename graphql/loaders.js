const DataLoader = require('dataloader')

module.exports = (pgdb) => {
  return {
    users: new DataLoader( (keys) => {
      return pgdb.public.users.find( {id: keys} )
    }),
    usersRolesForUserIds: new DataLoader( (keys) => {
      return pgdb.public.usersRoles.find( {userId: keys} )
    }),
    usersRolesForRoleIds: new DataLoader( (keys) => {
      return pgdb.public.usersRoles.find( {roleId: keys} )
    }),
    roles: new DataLoader( (keys) => {
      return pgdb.public.roles.find( {id: keys} )
    }),
    rewards: new DataLoader( (keys) => {
      return pgdb.public.rewards.find( {id: keys} )
    }),
  }
}
