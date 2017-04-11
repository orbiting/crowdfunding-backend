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
const crypto = require('crypto')
const {ascending} = require('d3-array')
const logger = require('../lib/logger')

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

const signIn = (email, req, t) => {
  if(req.user) {
    //fail gracefully
    return {phrase: ''}
  }

  if(!email.match(/^.+@.+\..+$/)) {
    logger.info('invalid email', { req: req._log(), email })
    throw new Error(t('api/email/invalid'))
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

ensureSignedIn = (req, t) => {
  if(!req.user) {
    logger.info('unauthorized', { req: req._log() })
    throw new Error(t('api/unauthorized'))
  }
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
    async faqs(_, args, {pgdb}) {
      return pgdb.public.faqs.find( args )
    }
  },

  User: {
    async roles(user, args, {loaders, pgdb}) {
      const userRoles = await loaders.usersRolesForUserIds.load(user.id)
      const roleIds = usersRoles.map( (ur) => { return ur.roleId } )
      return loaders.roles.load(roleIds)
    },
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
      //HACK speed/complexity optimization: we only have one crowdfunding now, so forget about
      //joining tables to find out which crowdfunding things belong to just return what we have in total
      //my boss: "mir möche kei crowdfunding platform!!!"
      const money = await pgdb.public.queryOneField('SELECT SUM(total) FROM pledges pl WHERE pl.status = $1', ['SUCCESSFULL']) || 0
      const people = await pgdb.public.queryOneField('SELECT COUNT(id) FROM memberships') || 0
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
    },
    async user(membership, args, {loaders, pgdb}) {
      return pgdb.public.users.findOne({id: membership.userId})
    }
  },

  RootMutation: {
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
    async updateAddress(_, args, {loaders, pgdb, req, user, t}) {
      ensureSignedIn(req, t)

      const {address} = args
      if(!user.addressId) { //user has no address yet
        const transaction = await pgdb.transactionBegin()
        try {
          const userAddress = await transaction.public.addresses.insertAndGet(address)
          await transaction.public.users.update({id: user.id}, {
            addressId: userAddress.id
          })
          return transaction.transactionCommit()
        } catch(e) {
          await transaction.transactionRollback()
          logger.error('error in transaction', { req: req._log(), args, error: e })
          throw new Error(t('api/unexpected'))
        }
      } else { //update address of user
        return pgdb.public.addresses.update({id: user.addressId}, address)
      }
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
    },
    async claimMembership(_, args, {loaders, pgdb, req, t}) {
      ensureSignedIn(req, t)

      //if this restriction gets removed, make sure to check if
      //the membership doesn't already belong to the user, before
      //making the the transfer and removing the voucherCode
      if(await pgdb.public.memberships.count({userId: req.user.id}))
        throw new Error(t('api/membership/claim/alreadyHave'))

      const {voucherCode} = args
      const transaction = await pgdb.transactionBegin()
      try {
        const membership = await transaction.public.memberships.findOne({voucherCode})
        if(!membership)
          throw new Error(t('api/membership/claim/invalidToken'))

        //transfer membership and remove voucherCode
        await transaction.public.memberships.updateOne({id: membership.id}, {
          userId: req.user.id,
          voucherCode: null
        })

        //commit transaction
        await transaction.transactionCommit()

        return true
      } catch(e) {
        await transaction.transactionRollback()
        logger.info('transaction rollback', { req: req._log(), args, error: e })
        throw e
      }
    },
    async submitPledge(_, args, {loaders, pgdb, req, t}) {
      const transaction = await pgdb.transactionBegin()
      try {
        const { pledge } = args
        const pledgeOptions = pledge.options


        // load original of chosen packageOptions
        const pledgeOptionsTemplateIds = pledgeOptions.map( (plo) => plo.templateId )
        const packageOptions = await transaction.public.packageOptions.find({id: pledgeOptionsTemplateIds})

        // check if all templateIds are valid
        if(packageOptions.length<pledgeOptions.length) {
          logger.error('one or more of the claimed templateIds are/became invalid', { req: req._log(), args, error: e })
          throw new Error(t('api/unexpected'))
        }

        // check if packageOptions are all from the same package
        // check if minAmount <= amount <= maxAmount
        // we don't check the pledgeOption price here, because the frontend always
        // sends whats in the templating packageOption, so we always copy the price
        // into the pledgeOption (for record keeping)
        let packageId = packageOptions[0].packageId
        pledgeOptions.forEach( (plo) => {
          const pko = packageOptions.find( (pko) => pko.id===plo.templateId)
          if(packageId!==pko.packageId) {
            logger.error('options must all be part of the same package!', { req: req._log(), args, plo, pko })
            throw new Error(t('api/unexpected'))
          }
          if(!(pko.minAmount <= plo.amount <= pko.maxAmount)) {
            logger.error(`amount in option (templateId: ${plo.templateId}) out of range`, { req: req._log(), args, pko, plo })
            throw new Error(t('api/unexpected'))
          }
        })

        //check total
        const minTotal = Math.max(pledgeOptions.reduce(
          (amount, plo) => {
            const pko = packageOptions.find( (pko) => pko.id===plo.templateId)
            return amount + (pko.userPrice
              ? (pko.minUserPrice * plo.amount)
              : (pko.price * plo.amount))
          }
          , 0
        ), 100)

        if(pledge.total < minTotal) {
          logger.error(`pledge.total (${pledge.total}) must be >= (${total})`, { req: req._log(), args, minTotal })
          throw new Error(t('api/unexpected'))
        }

        //calculate donation
        const regularTotal = Math.max(pledgeOptions.reduce(
          (amount, plo) => {
            const pko = packageOptions.find( (pko) => pko.id===plo.templateId)
            return amount + (pko.price * plo.amount)
          }
          , 0
        ), 100)

        const donation = pledge.total - regularTotal
        // check reason
        if(donation < 0 && !pledge.reason) {
          logger.error('you must provide a reason for reduced pledges', { req: req._log(), args, donation })
          throw new Error(t('api/unexpected'))
        }

        let user = null
        if(req.user) { //user logged in
          if(pledge.user) {
            logger.error('logged in users must no provide pledge.user', { req: req._log(), args })
            throw new Error(t('api/unexpected'))
          }
          user = req.user
        } else { //user not logged in
          if(!pledge.user) {
            logger.error('pledge must provide a user if not logged in', { req: req._log(), args })
            throw new Error(t('api/unexpected'))
          }
          //try to load existing user by email
          user = await transaction.public.users.findOne({email: pledge.user.email})
          if(user) {
            if(user.verified) {
              //a user with the email adress pledge.user.email already exists, login!
              return {
                emailVerify: true
              }
            } else { //user not verified
              //update user with new details
              user = await transaction.public.users.updateAndGetOne({id: user.id}, {
                name: pledge.user.name
              })
            }
          } else {
            user = await transaction.public.users.insertAndGet({
              email: pledge.user.email,
              name: pledge.user.name,
              verified: false
            })
          }
        }

        //check if user already has a reduced membership
        //see HACKHACK in payPledge
        if(donation < 0 && await transaction.public.memberships.count({userId: user.id, reducedPrice: true})) {
          logger.info('user tried to buy a second reduced membership', { req: req._log(), args })
          throw new Error(t('api/membership/reduced/alreadyHave'))
        }

        //insert pledge
        let newPledge = {
          userId: user.id,
          packageId,
          total: pledge.total,
          donation: donation,
          reason: pledge.reason,
          status: 'DRAFT'
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

        return {
          pledgeId: newPledge.id,
          userId: user.id
        }
      } catch(e) {
        await transaction.transactionRollback()
        logger.info('transaction rollback', { req: req._log(), args, error: e })
        throw e
      }
    },
    async payPledge(_, args, {loaders, pgdb, req, t}) {
      const transaction = await pgdb.transactionBegin()
      try {
        const { pledgePayment } = args

        //check pledgeId
        let pledge = await transaction.public.pledges.findOne({id: pledgePayment.pledgeId})
        if(!pledge) {
          logger.error(`pledge (${pledgePayment.pledgeId}) not found`, { req: req._log(), args, pledge })
          throw new Error(t('api/unexpected'))
        }
        if(pledge.status === 'SUCCESSFULL') {
          logger.error('pledge is already paid', { req: req._log(), args, pledge, pledgePayment })
          throw new Error(t('api/pledge/alreadyPaid'))
        }

        //check/charge payment
        let pledgeStatus
        let payment
        if(pledgePayment.method == 'PAYMENTSLIP') {
          if(!pledge.address) {
            logger.error('PAYMENTSLIP payments must include an address', { req: req._log(), args, pledge, pledgeStatus, payment })
            throw new Error(t('api/unexpected'))
          }

          //insert address
          const address = await transaction.public.addresses.insertAndGetOne(pledge.address)
          user = await transaction.public.users.updateAndGetOne({id: user.id}, {addressId: address.id})

          //only count PAYMENTSLIP payments up to CHF 1000.- immediately
          if(pledge.total > 100000) {
            pledgeStatus = 'WAITING_FOR_PAYMENT'
          } else {
            pledgeStatus = 'SUCCESSFULL'
          }
          payment = await transaction.public.payments.insertAndGet({
            type: 'PLEDGE',
            method: 'PAYMENTSLIP',
            total: pledge.total,
            status: 'WAITING'
          })

        } else if(pledgePayment.method == 'STRIPE') {
          if(!pledgePayment.sourceId) {
            logger.error('sourceId required', { req: req._log(), args, pledge, pledgeStatus, payment })
            throw new Error(t('api/unexpected'))
          }
          let charge = null
          try {
            charge = await stripe.charges.create({
              amount: pledge.total,
              currency: "chf",
              source: pledgePayment.sourceId
            })
          } catch(e) {
            logger.error('stripe charge failed', { req: req._log(), args, pledge, pledgeStatus, payment, e })
            //TODO sanitize error for client
            //throw to client
            throw e
          }
          //save payment ( outside of transaction to never loose it again)
          payment = await pgdb.public.payments.insertAndGet({
            type: 'PLEDGE',
            method: 'STRIPE',
            total: charge.amount,
            status: 'PAID',
            pspId: charge.id,
            pspPayload: charge
          })
          pledgeStatus = 'SUCCESSFULL'
          //save sourceId to user
          await transaction.public.paymentSources.insert({
            method: 'STRIPE',
            userId: user.id,
            pspId: charge.source.id,
            pspPayload: charge.source
          })

        } else if(pledgePayment.method == 'POSTFINANCECARD') {
          const pspPayload = JSON.parse(pledgePayment.pspPayload)
          if(!pspPayload) {
            logger.error('pspPayload required', { req: req._log(), args, pledge, pspPayload })
            throw new Error(t('api/unexpected'))
          }
          //check SHA of postfinance
          const SHASIGN = pspPayload.SHASIGN
          delete pspPayload.SHASIGN
          const secret = process.env.PF_SHA_OUT_SECRET
          //sort params based on upper case order (urgh!)
          const paramsString = Object.keys(pspPayload)
            .sort( (a, b) => ascending(a.toUpperCase(), b.toUpperCase()))
            .filter(key => pspPayload[key])
            .map(key => `${key.toUpperCase()}=${pspPayload[key]}${secret}`)
            .join('')
          const shasum = crypto.createHash('sha1').update(paramsString).digest('hex').toUpperCase()
          if(SHASIGN!==shasum) {
            logger.error('SHASIGN not correct', { req: req._log(), args, pledge, shasum, SHASIGN, pspPayload })
            throw new Error(t('api/unexpected'))
          }

          //check for replay attacks
          if(await pgdb.public.payments.count({pspId: pspPayload.PAYID})) {
            logger.error('this PAYID was used already 😲😒😢', { req: req._log(), args, pledge, pspPayload })
            throw new Error(t('api/unexpected'))
          }

          //save payment no matter what
          //PF amount is suddendly in franken
          payment = await pgdb.public.payments.insertAndGet({
            type: 'PLEDGE',
            method: 'POSTFINANCECARD',
            total: pspPayload.amount*100,
            status: 'PAID',
            pspId: pspPayload.PAYID,
            pspPayload: pspPayload
          })
          pledgeStatus = 'SUCCESSFULL'

          //check if amount is correct
          //PF amount is suddendly in franken
          if(pspPayload.amount*100 !== pledge.total) {
            logger.info('payed amount doesnt match with pledge', { req: req._log(), args, pledge, pspPayload })
            pledgeStatus = 'PAID_INVESTIGATE'
          }

          //save alias to user
          if(pspPayload.ALIAS) {
            await transaction.public.paymentSources.insert({
              method: 'POSTFINANCECARD',
              userId: user.id,
              pspId: pspPayload.ALIAS
            })
          }

        } else if(pledgePayment.method == 'PAYPAL') {
          const pspPayload = JSON.parse(pledgePayment.pspPayload)
          if(!pspPayload || !pspPayload.tx) {
            logger.error('pspPayload(.tx) required', { req: req._log(), args, pledge, pspPayload })
            throw new Error(t('api/unexpected'))
          }

          //check for replay attacks
          if(await pgdb.public.payments.count({pspId: pspPayload.tx})) {
            logger.error('this PAYID was used already 😲😒😢', { req: req._log(), args, pledge, pspPayload })
            throw new Error(t('api/unexpected'))
          }

          const transactionDetails = {
            'METHOD': 'GetTransactionDetails',
            'TRANSACTIONID': pspPayload.tx,
            'VERSION': '204.0',
            'USER': process.env.PAYPAL_USER,
            'PWD': process.env.PAYPAL_PWD,
            'SIGNATURE': process.env.PAYPAL_SIGNATURE
          }
          const form = querystring.stringify(transactionDetails)
          const contentLength = form.length
          const response = await fetch(process.env.PAYPAL_URL, {
            method: 'POST',
            headers: {
              'Content-Length': contentLength,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: form
          })
          const responseDict = querystring.parse(await response.text())
          if(responseDict.ACK !== 'Success') {
            logger.error('paypal transaction invalid', { req: req._log(), args, pledge, pspPayload, responseDict })
            throw new Error(t('api/unexpected'))
            //TODO sanitize paypal error for client
          }

          //get paypal amount (is decimal)
          const amount = parseFloat(responseDict.AMT)*100

          //save payment no matter what
          payment = await pgdb.public.payments.insertAndGet({
            type: 'PLEDGE',
            method: 'PAYPAL',
            total: amount,
            status: 'PAID',
            pspId: pspPayload.tx,
            pspPayload: responseDict
          })
          pledgeStatus = 'SUCCESSFULL'

          //check if amount is correct
          if(amount !== pledge.total) {
            logger.info('payed amount doesnt match with pledge', { req: req._log(), args, pledge, pspPayload, payment })
            pledgeStatus = 'PAID_INVESTIGATE'
          }
        } else {
          throw new Error('unsupported paymentMethod')
        }
        if(!payment || !pledgeStatus) {
          logger.error('payment or pledgeStatus undefined', { req: req._log(), args, pledge, pspPayload, payment, pledgeStatus })
          throw new Error(t('api/unexpected'))
        }

        //insert pledgePayment
        await transaction.public.pledgePayments.insert({
          pledgeId: pledge.id,
          paymentId: payment.id,
          paymentType: 'PLEDGE'
        })

        if(pledge.status !== pledgeStatus) {
          //generate Memberships
          // TODO extract to function
          if(pledgeStatus === 'SUCCESSFULL') {
            // get augmented pledge options
            const pledgeOptions = await transaction.public.pledgeOptions.find({pledgeId: pledge.id})
            const packageOptions = await transaction.public.packageOptions.find({id: pledgeOptions.map( (plo) => plo.templateId)})
            const rewards = await transaction.public.rewards.find({id: packageOptions.map( (pko) => pko.rewardId)})
            if(rewards.length) { //otherwise it's a donation-only pledge
              const membershipTypes = await transaction.public.membershipTypes.find({rewardId: rewards.map( (r) => r.id)})
              // assemble tree
              rewards.forEach( (r) => {
                r.membershipType = membershipTypes.find( (mt) => r.id===mt.rewardId)
              })
              packageOptions.forEach( (pko) => {
                pko.reward = rewards.find( (r) => pko.rewardId===r.id)
              })
              pledgeOptions.forEach( (plo) => {
                plo.packageOption = packageOptions.find( (pko) => plo.templateId===pko.id)
              })

              //HACKHACK if the pledge has a negative donation:
              // 1) it's a one membership pledge
              // 2) this membership was bought for a reduced price
              // 3) this membership is not voucherable
              // voucherCodes get generated inside the db, but not for reducedPrice
              const reducedPrice = pledge.donation < 0

              const memberships = []
              pledgeOptions.forEach( (plo) => {
                if(plo.packageOption.reward.type === 'MembershipType') {
                  for(let c=0; c<plo.amount; c++) {
                    memberships.push({
                      userId: user.id,
                      pledgeId: pledge.id,
                      membershipTypeId: plo.packageOption.reward.membershipType.id,
                      beginDate: new Date(),
                      reducedPrice
                    })
                  }
                }
              })
              await transaction.public.memberships.insert(memberships)
            }
          }
          // update pledge status
          pledge = await transaction.public.pledges.updateAndGetOne({id: pledge.id}, {status: pledgeStatus})
        }

        //commit transaction
        await transaction.transactionCommit()

        return {
          pledgeId: pledge.id
        }
      } catch(e) {
        await transaction.transactionRollback()
        logger.info('transaction rollback', { req: req._log(), error: e })
        throw e
      }

    },
    async reclaimPledge(_, args, {loaders, pgdb, req, t}) {
      const transaction = await pgdb.transactionBegin()
      try {
        const { pledgeClaim } = args
        //check pledgeId
        let pledge = await transaction.public.pledges.findOne({id: pledgeClaim.pledgeId})
        if(!pledge) {
          logger.error(`pledge (${pledgeClaim.pledgeId}) not found`, { req: req._log(), args, pledge })
          throw new Error(t('api/unexpected'))
        }

        //load original user of pledge
        const pledgeUser = await transaction.public.users.findOne({id: pledge.userId})
        if(pledgeUser.email === pledgeClaim.email) {
          logger.info('pledge already belongs to the claiming email', { req: req._log(), args, pledgeUser })
          return {
            pledgeId: pledge.id,
            userId: pledge.userId
          }
        }
        if(pledgeUser.verified) {
          logger.error('cannot claim pledges of verified users', { req: req._log(), args, pledge })
          throw new Error(t('api/unexpected'))
        }

        //check logged in user
        if(req.user) {
          if(req.user.email !== pledgeClaim.email) {
            logger.error('logged in users can only claim pledges to themselfs', { req: req._log(), args, pledge })
            throw new Error(t('api/unexpected'))
          }
          //transfer pledge to signin user
          pledge = await transaction.public.pledges.updateAndGetOne({id: pledge.id}, {userId: req.user.email})
        } else {
          //change email of pledgeUser
          await transaction.public.users.update({id: pledgeUser.id}, {email: pledgeClaim.email})
        }

        //commit transaction
        await transaction.transactionCommit()

        return {
          pledgeId: pledge.id,
          userId: pledge.userId
        }
      } catch(e) {
        await transaction.transactionRollback()
        logger.info('transaction rollback', { req: req._log(), error: e })
        throw e
      }
    }
  }
}

module.exports = resolveFunctions
