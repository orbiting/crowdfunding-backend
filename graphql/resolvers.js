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
    async submitPledge(_, args, {loaders, pgdb}) {
      console.log("submitPledge")
      const transaction = await pgdb.transactionBegin()
      let newPledge = null
      try {
        //dummy user
        const user = await transaction.public.users.findOne( {email: 'patrick.recher@project-r.construction'} )

        const { pledge } = args
        const { packageOptions } = pledge
        //console.log(pledge)

        // load original of chosen packageOptions
        let packageOptionTemplateIds = packageOptions.map( (po) => { return parseInt(po.templateId) } )
        const ourPackageOptions = await transaction.public.packageOptions.find({id: packageOptionTemplateIds})

        // check if all templateIds are valid
        if(ourPackageOptions.length<packageOptions.length)
          throw new Error("one or more of the claimed templateIds are/became invalid")

        // check if packageOptions are all from the same package
        let packageId = ourPackageOptions[0].id
        ourPackageOptions.forEach( (opo) => {
          if(packageId!==opo.packageId)
            throw new Error("packageOptions must all be part of the same package!")
        })

        // check if amount > 0
        // check if prices are correct / still the same
        packageOptions.forEach( (po) => {
          const opo = ourPackageOptions.find( (opo) => opo.id===po.templateId)
          if(!opo) throw new Error("this should not happen")
          if(po.amount <= 0)
            throw new Error(`amount in packageOption (templateId: ${po.templateId}) must be > 0`)
          if(po.price !== opo.price && !opo.userPrice)
            throw new Error(`price in packageOption (templateId: ${po.templateId}) invalid/changed!`)
        })

        // check total
        let total = 0
        packageOptions.forEach( (po) => {
          total += (po.amount * po.price)
        })
        if(total !== pledge.total)
          throw new Error(`pledge.total (${pledge.total}) should be (${total})`)

        //insert pledge
        let newPledge = {
          userId: user.id, //FIXME
          packageId,
          total
        }
        newPledge = await transaction.public.pledges.insertAndGet(newPledge)

        //insert pledgeOptions
        const newPackageOptions = await Promise.all(packageOptions.map( (po) => {
          po.pledgeId = newPledge.id
          return transaction.public.pledgeOptions.insertAndGet(po)
        }))
        newPledge.packageOptions = newPackageOptions
        console.log(newPledge)

        await transaction.transactionCommit()
        return newPledge;
      } catch(e) {
        await transaction.transactionRollback()
        throw e
      }
    }
  }
}

module.exports = resolveFunctions
