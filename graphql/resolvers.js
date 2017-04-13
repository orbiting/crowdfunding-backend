const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')
const logger = require('../lib/logger')
const ensureSignedIn = require('../lib/ensureSignedIn')
const signIn = require('../lib/signIn')
const sendMail = require('../lib/sendMail')
const mutations = require('./mutations/index')

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
    async me(_, args, {loaders, pgdb, user}) {
      return user
    },
    async crowdfundings(_, args, {loaders, pgdb, req}) {
      return pgdb.public.crowdfundings.find()
    },
    async crowdfunding(_, args, {loaders, pgdb}) {
      return pgdb.public.crowdfundings.findOne( args )
    },
    async pledges(_, args, {loaders, pgdb, user}) {
      if(!user) return []
      return pgdb.public.pledges.find( {userId: user.id} )
    },
    async pledge(_, args, {loaders, pgdb, req}) {
      if(req.user) {
        return pgdb.public.pledges.findOne({
          id: args.id,
          userId: req.user.id
        })
      } else {
        const pledge = await pgdb.public.pledges.findOne({id: args.id})
        const user = await pgdb.public.users.findOne({id: pledge.userId})
        if(!user.verified) {
          return pledge
        }
      }
      return null
    },
    async draftPledge(_, args, {loaders, pgdb, req}) {
      //used after payPledge, when user comes back from PSP to load pledge again on
      //pledge site, then client sends the psp payment information it received via
      //query params. Pledge must not be successfull in this state, otherwise user
      //clicked back and we want to show him a nice error.
      const pledge = await pgdb.public.pledges.findOne({id: args.id})
      if(pledge.status === 'SUCCESSFULL') {
        logger.error('draftPledge for successfull pledge', { req: req._log(), args, pledge })
        throw new Error(t('api/pledge/alreadyPaid'))
      }
      const user = await pgdb.public.users.findOne({id: pledge.userId})
      if(req.user.id === user.id || !user.verified) {
        return pledge
      } else {
        logger.error('unauthorized draftPledge', { req: req._log(), args, pledge })
        throw new Error(t('api/unauthorized'))
      }
    },
    async faqs(_, args, {pgdb}) {
      return pgdb.public.faqs.find( args )
    }
  },

  User: {
    async address(user, args, {loaders, pgdb}) {
      if(!user.addressId) return null
      return pgdb.public.addresses.findOne({id: user.addressId})
    },
    async memberships(user, args, {loaders, pgdb}) {
      return pgdb.public.memberships.find({userId: user.id})
    },
    async pledges(user, args, {loaders, pgdb}) {
      return pgdb.public.pledges.find({userId: user.id})
    }
  },
  Crowdfunding: {
    async packages(crowdfunding, args, {loaders, pgdb}) {
      return pgdb.public.packages.find( {crowdfundingId: crowdfunding.id} )
    },
    async goal(crowdfunding) {
      return {
        money: crowdfunding.goalMoney,
        people: crowdfunding.goalPeople
      }
    },
    async status(crowdfunding, args, {loaders, pgdb}) {
      const money = await pgdb.public.queryOneField(`
        SELECT SUM(pl.total)
        FROM pledges pl
        JOIN packages pa ON pl."packageId"=pa.id
        WHERE pl.status = $1
        AND pa."crowdfundingId"=$2`, ['SUCCESSFULL', crowdfunding.id]) || 0
      const people = await pgdb.public.queryOneField(`
        SELECT COUNT(m.id)
        FROM memberships m
        JOIN pledges pl ON m."pledgeId"=pl.id
        JOIN packages pa ON pl."packageId"=pa.id
        WHERE pa."crowdfundingId"=$1`, [crowdfunding.id]) || 0
      return {money, people}
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
      return obj.rewardType
    }
  },
  Pledge: {
    async options(pledge, args, {loaders, pgdb}) {
      //we augment pledgeOptions with packageOptions
      const pledgeOptions = await pgdb.public.pledgeOptions.find( {pledgeId: pledge.id} )
      const pledgeOptionTemplateIds = pledgeOptions.map( (plo) => plo.templateId )
      const packageOptions = await pgdb.public.packageOptions.find( {id: pledgeOptionTemplateIds} )
      return pledgeOptions.map( (plo) => {
        const pko = packageOptions.find( (pko) => plo.templateId==pko.id )
        pko.id = plo.pledgeId+'-'+plo.templateId //combinded primary key
        pko.amount = plo.amount
        pko.templateId = plo.templateId
        pko.price = plo.price
        pko.createdAt = plo.createdAt
        pko.updatedAt = plo.updatedAt
        return pko
      })
    },
    async package(pledge, args, {loaders, pgdb}) {
      return pgdb.public.packages.findOne({id: pledge.packageId})
    },
    async user(pledge, args, {loaders, pgdb, t}) {
      return pgdb.public.users.findOne({id: pledge.userId})
    },
    async payments(pledge, args, {loaders, pgdb}) {
      const pledgePayments = await pgdb.public.pledgePayments.find({pledgeId: pledge.id})
      return pgdb.public.payments.find({id: pledgePayments.map( (pp) => { return pp.paymentId })})
    },
    async memberships(pledge, args, {loaders, pgdb}) {
      return pgdb.public.memberships.find({pledgeId: pledge.id})
    }
  },
  Membership: {
    async type(membership, args, {loaders, pgdb}) {
      return pgdb.public.membershipTypes.findOne({id: membership.membershipTypeId})
    }
  },

  RootMutation: Object.assign({}, mutations, {
    async signIn(_, args, {loaders, pgdb, user, req}) {
      return signIn(args.email, req)
    },
    async signOut(_, args, {loaders, pgdb, user, req}) {
      if(!req.session)
        return
      req.session.destroy(function(error) {
        if(error) {
          logger.error('error trying to destroy session', { req: req._log(), error })
        }
      })
      return true
    },
    async submitQuestion(_, args, {loaders, pgdb, user, t}) {
      ensureSignedIn(req, t)

      const { question } = args
      sendMail({
        to: process.env.QUESTIONS_MAIL_TO_ADDRESS,
        from: user.email,
        subject: 'new (FA)Question asked!',
        text: question
      })

      return {success: true}
    }
  })
}

module.exports = resolveFunctions
