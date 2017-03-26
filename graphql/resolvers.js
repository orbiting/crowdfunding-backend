const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')

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
      return pgdb.public.crowdfundings.find()
    },
    async crowdfunding(_, args, {loaders, pgdb}) {
      return pgdb.public.crowdfundings.findOne( args )
    },
    async pledges(_, args, {loaders, pgdb, user}) {
      if(!user)
        return null
      return pgdb.public.pledges.find( {userId: user.id} )
    },
    async checkEmail(_, args, {pgdb}) {
      const count = await pgdb.public.users.count( args )
      return { free: !count }
    }
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
  Pledge: {
    async options(pledge, args, {loaders, pgdb}) {
      const pledgeOptions = await pgdb.public.pledgeOptions.find( {pledgeId: pledge.id} )
      const pledgeOptionTemplateIds = pledgeOptions.map( (plo) => plo.templateId )
      const packageOptions = await pgdb.public.packageOptions.find( {id: pledgeOptionTemplateIds} )

      return packageOptions.map( (pko) => {
        const plo = pledgeOptions.find( (plo) => plo.templateId==pko.id )
        if(!plo) throw new Error("this should not happen")
        pko.id = plo.pledgeId+'-'+plo.templateId //combinded primary key
        pko.amount = plo.amount
        pko.templateId = plo.templateId
        pko.price = plo.price
        return pko
      })
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
        const pledgeOptions = pledge.options
        console.log(pledge)

        // load original of chosen packageOptions
        const pledgeOptionsTemplateIds = pledgeOptions.map( (plo) => plo.templateId )
        const packageOptions = await transaction.public.packageOptions.find({id: pledgeOptionsTemplateIds})

        // check if all templateIds are valid
        if(packageOptions.length<pledgeOptions.length)
          throw new Error("one or more of the claimed templateIds are/became invalid")

        // check if packageOptions are all from the same package
        let packageId = packageOptions[0].packageId
        packageOptions.forEach( (pko) => {
          if(packageId!==pko.packageId)
            throw new Error("options must all be part of the same package!")
        })

        // check if amount > 0
        // check if prices are correct / still the same
        pledgeOptions.forEach( (plo) => {
          const pko = packageOptions.find( (pko) => pko.id===plo.templateId)
          if(!pko) throw new Error("this should not happen")
          if(plo.amount <= 0)
            throw new Error(`amount in option (templateId: ${plo.templateId}) must be > 0`)
          if(plo.price !== pko.price && !pko.userPrice)
            throw new Error(`price in option (templateId: ${plo.templateId}) invalid/changed!`)
        })

        // check total
        let total = 0
        pledgeOptions.forEach( (plo) => {
          total += (plo.amount * plo.price)
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
        const newPledgeOptions = await Promise.all(pledgeOptions.map( (plo) => {
          plo.pledgeId = newPledge.id
          return transaction.public.pledgeOptions.insertAndGet(plo)
        }))
        newPledge.packageOptions = newPledgeOptions
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
