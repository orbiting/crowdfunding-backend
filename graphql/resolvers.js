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
const t = require('tcomb-validation')


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

const signIn = (email, req) => {
  if(req.user) {
    //fail gracefully
    return {phrase: ''}
  }

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
}

const isEmailFree = async (email, pgdb) => {
  return !(await pgdb.public.users.count({email: pledge.user.email}))
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
    },
    async goal(crowdfunding) {
      return {
        money: crowdfunding.goalMoney,
        people: crowdfunding.goalPeople
      }
    },
    async status(crowdfunding, args, {loaders, pgdb}) {
      const money = await pgdb.public.queryOneField('SELECT SUM(total) FROM pledges pl JOIN packages pa ON pl."packageId"=pa.id WHERE pl.status = $1 AND pa."crowdfundingId" = $2', ['SUCCESSFULL', crowdfunding.id]) || 0
      const people = await pgdb.public.queryOneField('SELECT COUNT(DISTINCT("userId")) FROM pledges pl JOIN packages pa ON pl."packageId"=pa.id WHERE pl.status = $1 AND pa."crowdfundingId" = $2', ['SUCCESSFULL', crowdfunding.id])
      return {
        money,
        people
      }
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
      return signIn(args.email, req)
    },
    async signOut(_, args, {loaders, pgdb, user, req}) {
      if(!req.session)
        return
      req.session.destroy(function(err) {
        if(err) { throw (err) }
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
    async submitPledge(_, args, {loaders, pgdb, req}) {
      const transaction = await pgdb.transactionBegin()
      try {
        const { pledge } = args
        console.log(pledge)

        if(req.user) { //user logged in
          if(pledge.user) {
            throw new Error('logged in users must no provide pledge.user')
          }
        } else { //user not logged in
          if(!pledge.user) {
            throw new Error('pledge must provide a user if not logged in')
          }
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
        if(pledge.total < total)
          throw new Error(`pledge.total (${pledge.total}) should be >= (${total})`)

        //check address
        const AddressInput = t.struct({
          name: t.String,
          line1: t.String,
          line2: t.String,
          postalCode: t.String,
          city: t.String,
          country: t.String
        })
        if(!t.validate(pledge.address, AddressInput).isValid()) {
          throw new Error('pledge.address incomplete')
        }

        let user = null
        if(req.user) { //user logged in
          user = req.user
        } else { //user not logged in
          const UserInput = t.struct({
            email: t.String,
            name: t.String,
            birthday: t.String
          })
          if(!t.validate(pledge.user, UserInput).isValid()) {
            throw new Error('pledge.user incomplete')
          }
          if(!isEmailFree(pledge.user.email)) {
            throw new Error('a user with the email adress pledge.user.email already exists, login!')
          }
          user = await transaction.public.users.insertAndGet({
            email: pledge.user.email,
            name: pledge.user.name,
            birthday: pledge.user.birthday,
            verified: false
          })
        }
        if(!user.addressId) { //user has no address yet
          const userAddress = await transaction.public.addresses.insertAndGet(pledge.address)
          await transaction.public.users.update({id: user.id}, {
            addressId: userAddress.id
          })
        }

        //insert address
        const pledgeAddress = await transaction.public.addresses.insertAndGet(pledge.address)

        //insert pledge
        let newPledge = {
          userId: user.id,
          packageId,
          total: pledge.total,
          status: 'DRAFT',
          addressId: pledgeAddress.id
        }
        newPledge = await transaction.public.pledges.insertAndGet(newPledge)

        //insert pledgeOptions
        const newPledgeOptions = await Promise.all(pledge.options.map( (plo) => {
          plo.pledgeId = newPledge.id
          return transaction.public.pledgeOptions.insertAndGet(plo)
        }))
        newPledge.packageOptions = newPledgeOptions

        //commit transaction
        await transaction.transactionCommit()

        console.log(newPledge)
        return newPledge
      } catch(e) {
        await transaction.transactionRollback()
        throw e
      }
    },
    async payPledge(_, args, {loaders, pgdb, req}) {
      const transaction = await pgdb.transactionBegin()
      try {
        const { pledgePayment } = args
        console.log(pledgePayment)

        //check pledgeId
        let pledge = await transaction.public.pledges.find({id: pledgePayment.pledgeId})
        if(!pledge) {
          throw new Error(`pledge (${pledgePayment.pledgeId}) not found`)
        }

        //load user
        let user = await transaction.public.users.find({id: pledge.userId})
        if(!user) {
          throw new Error(`pledge user not found`)
        }
        if(req.user) { //a user is logged in
          if(req.user.id !== user) {
            console.log("pledge doesn't belong to signed in user, transfering...")
            user = req.user
            pledge = await transaction.public.pledges.updateAndGet({id: pledge.id}, {userId: user.id})
          }
        }

        //check/charge payment
        let pledgeStatus
        let payment
        if(pledgePayment.method == 'PAYMENTSLIP') {
          pledgeStatus = 'WAITING_FOR_PAYMENT'
          payment = await transaction.public.payments.insertAndGet({
            type: 'PLEDGE',
            method: 'PAYMENTSLIP',
            total: pledge.total,
            status: 'WAITING'
          })
        } else if(pledgePayment.method == 'STRIPE') {
          if(!pledgePayment.sourceId) {
            throw new Error('sourceId required')
          }
          let charge = null
          try {
            charge = await stripe.charges.create({
              amount: pledge.total,
              currency: "chf",
              source: pledge.payment.sourceId
            })
          } catch(e) {
            //throw to client
            throw e
          }
          pledgeStatus = 'SUCCESSFULL'
          //save payment (is done outside of transaction,
          //to never loose it again)
          payment = await pgdb.public.payments.insertAndGet({
            type: 'PLEDGE',
            method: 'STRIPE',
            total: charge.amount,
            status: 'PAID',
            pspPayload: charge
          })
          //save stripeSourceId to user
          await transaction.public.paymentSources.insert({
            method: 'STRIPE',
            userId: user.id,
            pspId: charge.source.id,
            pspPayload: charge.source
          })
        } else {
          throw new Error('unsupported paymentMethod')
        }
        if(!payment || !pledgeStatus) {
          throw new Error('should not happen')
        }

        if(pledge.status !== pledgeStatus) {
          pledge = await transaction.public.pledges.updateAndGet({id: pledge.id}, {status: pledgeStatus})
        }

        //TODO generate Memberships

        //insert pledgePayment
        await transaction.public.pledgePayments.insert({
          pledgeId: pledge.id,
          paymentId: payment.id,
          paymentType: 'PLEDGE'
        })

        //commit transaction
        await transaction.transactionCommit()

        //signin user
        //if(!req.user) {
        //  signIn(user.email, req) //TODO return phrase
        //}

        console.log(pledge)
        return pledge
      } catch(e) {
        await transaction.transactionRollback()
        throw e
      }

    }
  }
}

module.exports = resolveFunctions
