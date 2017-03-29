const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const querystring = require('querystring')
const uuid = require('uuid/v4')
const rndWord = require('random-noun-generator-german')
const kraut = require('kraut')
const geoipDatabase = require('geoip-database')
const maxmind = require('maxmind')
const cityLookup = maxmind.openSync(geoipDatabase.city)


const getGeoForIp = (ip) => {
  const geo = cityLookup.get(ip)
  let country = null
  try { country = geo.country.names.de } catch(e) { }
  let city = null
  try { city = geo.city.names.de } catch(e) { }
  if(!country && !city) {
    return null
  }
  if(city) {
    return city+', '+country
  }
  return country
}

const sendMail = (mail) => {
  const form = querystring.stringify(mail)
  const contentLength = form.length

  return fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic '+(new Buffer('api:'+process.env.MAILGUN_API_KEY).toString('base64')),
      'Content-Length': contentLength,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  })
}


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
    },
    async faqs(_, args, {pgdb}) {
      return pgdb.public.faqs.find( args )
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
      return obj.rewardType
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
    async signIn(_, args, {loaders, pgdb, user, req}) {
      if(user) {
        //fail gracefully
        return {phrase: ''}
      }

      const {email} = args

      //TODO check email validity
      if(!email.match(/^.+@.+\..+$/)) {
        throw new Error('Email-Adresse nicht gültig.')
      }

      const token = uuid()
      const ua = req.headers['user-agent']
      const phrase = kraut.adjectives.random()+' '+kraut.verbs.random()+' '+rndWord()
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      const geo = getGeoForIp(ip)
      let geoString = ''
      if(geo) {
        geoString = 'Login Versuch aus: '+geo+'.\n\n'
      }

      req.session.email = email
      req.session.token = token
      req.session.ip = ip
      req.session.ua = ua
      if(geo) {
        req.session.geo = geo
      }

      const verificationUrl = (process.env.PUBLIC_URL || 'http://'+req.headers.host)+'/auth/email/signin/'+token
      sendMail({
        to: email,
        from: process.env.AUTH_MAIL_FROM_ADDRESS,
        subject: 'Login Link',
        text: `Ma’am, Sir,\n\n${geoString}Falls Ihnen dass Ihnen folgende Wörter angezeigt wurden: <${phrase}>,klicken Sie auf den folgenden Link um sich einzuloggen:\n${verificationUrl}\n`
      })

      return {phrase}
    },
    async signOut(_, args, {loaders, pgdb, user, req}) {
      if(!user) {
        throw new Error('not signed in')
      }
      req.session.destroy(function(err) {
        if(err) {
          throw (err)
        }
      })
      return true
    },
    async submitQuestion(_, args, {loaders, pgdb, user}) {
      if(!user) {
        throw new Error('login required')
      }
      const { question } = args
      sendMail({
        to: process.env.QUESTIONS_MAIL_TO_ADDRESS,
        from: user.email,
        subject: 'new (FA)Question asked!',
        text: question
      })

      return {success: true}
    },
    async submitPledge(_, args, {loaders, pgdb, user}) {
      console.log("submitPledge")
      const transaction = await pgdb.transactionBegin()
      let newPledge = null
      try {
        const { pledge } = args
        console.log(pledge)

        let pledgeUser = null
        if(user) { //user logged in
          if(pledge.user) {
            throw new Error('logged in users must no provide pledge.user')
          }
          pledgeUser = user
        } else { //user not logged in
          if(!pledge.user) {
            throw new Error('pledge must provide a user if not logged in')
          }
          if(await transaction.public.users.findOne( {email: pledge.user.email} )) {
            throw new Error('a user with the email adress pledge.user.email already exists, login!')
          }
          pledgeUser = await transaction.public.users.insertAndGet( {
            email: pledge.user.email,
            name: pledge.user.name
          })
        }

        const pledgeOptions = pledge.options

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
        if(total < pledge.total)
          throw new Error(`pledge.total (${pledge.total}) should be >= (${total})`)
        total = pledge.total

        //check payment
        const {payment} = pledge
        //TODO support other payment methods
        if(payment.method == 'VISA' || payment.method !== 'MASTERCARD') {
          if(!payment.stripeSourceId) {
            throw new Error('stripeSourceId required')
          }
          const charge = await stripe.charges.create({
            amount: pledge.total,
            currency: "chf",
            source: payment.stripeSourceId
          })
          //TODO save stripeSourceId to customer
          //TODO save pledgePayment
          console.log("charge")
          console.log(charge)
        } else {
          throw new Error('unsupported paymentMethod')
        }


        //insert pledge
        let newPledge = {
          userId: pledgeUser.id,
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

        //TODO insert payment


        await transaction.transactionCommit()
        return newPledge
      } catch(e) {
        await transaction.transactionRollback()
        throw e
      }
    }
  }
}

module.exports = resolveFunctions
