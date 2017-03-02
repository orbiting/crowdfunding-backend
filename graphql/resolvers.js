import { GraphQLScalarType } from 'graphql'
import { Kind } from 'graphql/language'

const resolveFunctions = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return new Date(value)
    },
    serialize(value) {
      return value.toISOString()
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value)
      }
      return null
    },
  }),

  RootQuery: {
    async users(_, args, {loaders, pgdb}) {
      return pgdb.public.users.find( args )
    },
    async roles(_, args, {loaders, pgdb}) {
      return pgdb.public.roles.find( args )
    },
    async crowdfundings(_, args, {loaders, pgdb}) {
      return pgdb.public.crowdfundings.find( args )
    },
  },

  User: {
    async roles(user, args, {loaders, pgdb}) {
      const userRoles = await loaders.usersRolesForUserIds.load(user.id)
      const roleIds = usersRoles.map( (ur) => { return ur.roleId } )
      return loaders.roles.load(roleIds)
    }
  },
  Role: {
    async users(role, args, {loaders, pgdb}) {
      const userRoles = await loaders.usersRolesForRoleIds.load(role.id)
      const userIds = usersRoles.map( (ur) => { return ur.userId } )
      return loaders.users.load(userIds)
    }
  },
  Crowdfunding: {
    async packages(crowdfunding, args, {loaders, pgdb}) {
      return pgdb.public.packages.find( {crowdfundingId: crowdfunding.id} )
    }
  },
  Package: {
    async options(package_, args, {loaders, pgdb}) {
      return pgdb.public.packageOptions.find( {packageId: package_.id} )
    }
  },
  PackageOption: {
    async reward(packageOption, args, {loaders, pgdb}) {
      return Promise.all( [
        pgdb.public.goodies.find( {rewardId: packageOption.rewardId} ),
        pgdb.public.membershipTypes.find( {rewardId: packageOption.rewardId} )
      ]).then( (arr) => {
        return arr[0].concat(arr[1])[0]
      })
    }
  },
  Reward: {
    __resolveType(obj, context, info) {
      // obj is the entity from the DB and thus has the "rewardType" column used as FK
      return obj.rewardType;
    }
  },

  RootMutation: {
    submitPledge(numItems) {
      //FIXME numItems is undefined
      //console.log("numItems", numItems)
      //const _numItems = 20;
      //return User.where({email: 'patrick.recher@project-r.construction'}).fetch().then( user => {
      //  return Crowdfunding.where({name: 'all or nothing'}).fetch().then( cf => {
      //    return Item.where({name: 'one membership'}).fetch().then( item => {
      //      user = user.toJSON()
      //      cf = cf.toJSON()
      //      item = item.toJSON()
      //      return new Pledge({
      //        crowdfunding_id: cf.id,
      //        user_id: user.id,
      //        brutto: (item.price*_numItems),
      //        payed: false
      //      }).save().then( pledge => {
      //        pledge = pledge.toJSON()
      //        new ItemPledge({
      //          pledge_id: pledge.id,
      //          item_id: item.id,
      //          numItems: _numItems
      //        }).save().then( itemPledge => {
      //          //pledge.itemPledges = [itemPledge]
      //          return pledge
      //        })
      //      })
      //    })
      //  })
      //})
    }
  }
}

module.exports = resolveFunctions
