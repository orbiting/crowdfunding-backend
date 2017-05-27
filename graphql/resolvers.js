const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')
const logger = require('../lib/logger')
const mutations = require('./mutations/index')
const queries = require('./queries/index')
const {utcTimeFormat, utcTimeParse} = require('../lib/formats')
const nest = require('d3-collection').nest
const {descending} = require('d3-array')

const dateFormat = utcTimeFormat('%x') //%x - the locale’s date
const dateParse = utcTimeParse('%x %H %Z') //%x - the locale’s date, %H and %Z for timezone normalization
const collator = new Intl.Collator('de')

const {hasPostalCodesForCountry, postalCodeData, postalCodeParsers} = require('../lib/geo/postalCode')
const countryNameNormalizer = require('../lib/geo/country').nameNormalizer
const countryDetailsForName = require('../lib/geo/country').detailsForName

const resolveFunctions = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date (format %d.%m.%Y)',
    parseValue(value) {
      // parse dates as 12:00 Zulu
      return dateParse(value+' 12 Z')
    },
    serialize(value) {
      //value is a js date at 12:00 Zulu
      //or an ISO String
      if((typeof value) === 'string') {
        value = new Date(value)
      }
      return dateFormat(value)
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return dateParse(ast.value+' 12 Z')
      }
      return null
    },
  }),
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime (format ISO-8601)',
    parseValue(value) {
      return new Date(value)
    },
    serialize(value) {
      if((typeof value) === 'string') {
        value = new Date(value)
      }
      return value.toISOString()
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value)
      }
      return null
    },
  }),

  RootQuery: Object.assign({}, queries, {
    async me(_, args, {pgdb, user}) {
      return user
    },
    async crowdfundings(_, args, {pgdb, req}) {
      return pgdb.public.crowdfundings.find()
    },
    async crowdfunding(_, args, {pgdb}) {
      return pgdb.public.crowdfundings.findOne( args )
    },
    async pledges(_, args, {pgdb, user}) {
      if(!user) return []
      return pgdb.public.pledges.find( {userId: user.id} )
    },
    async pledge(_, args, {pgdb, req}) {
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
        } else {
          //user not logged in, but verified. Return pledge only if draft and user has no non-draft pledges
          //this is for:
          //a verified user without pledges can submit a new pledge without email verify,
          //so he must be able to retreive them later.
          const hasNonDraftPledges = await pgdb.public.pledges.findFirst({
            userId: user.id,
            'status !=': 'DRAFT'
          })
          if(pledge.status === 'DRAFT' && !hasNonDraftPledges) {
            return pledge
          }
        }
      }
      return null
    },
    async faqs(_, args, {pgdb}) {
      const data = await pgdb.public.gsheets.findOneFieldOnly({name: 'faqs'}, 'data')
      if(!data) return []
      return data.filter( d => d.published )
    },
    async events(_, args, {pgdb}) {
      const data = await pgdb.public.gsheets.findOneFieldOnly({name: 'events'}, 'data')
      if(!data) return []
      return data
        .filter( d => d.published )
        .sort( (a,b) => new Date(a.date) - new Date(b.date) )
    },
    async updates(_, args, {pgdb}) {
      const data = await pgdb.public.gsheets.findOneFieldOnly({name: 'updates'}, 'data')
      if(!data) return []
      const now = new Date()
      return data
        .filter( d => (new Date(d.publishedDateTime) < now) )
        .sort( (a,b) => new Date(b.publishedDateTime) - new Date(a.publishedDateTime) )
    },
    async membershipStats(_, args) {
      return {} //see detail resolvers below
    },
    async testimonialStats(_, args, {pgdb}) {
      return {
        count: await pgdb.public.testimonials.count({
          published: true,
          adminUnpublished: false
        })
      }
    },
    async paymentStats(_, args, {pgdb}) {
      const paymentMethods = (await pgdb.query(`
        SELECT
          method,
          count(*) AS count
        FROM payments
        GROUP BY 1
        ORDER BY 2 DESC
      `)).map( async (datum) => {
        if(datum.method === 'PAYMENTSLIP') {
          const numPaperInvoice = await pgdb.queryOneField(`
            SELECT
              count(*)
            FROM payments
            WHERE
              method = 'PAYMENTSLIP'
              AND "paperInvoice" = true
          `)
          datum.details = [
            { detail: 'paperInvoice',
              count: numPaperInvoice }
          ]
        } else {
          datum.details = []
        }
        return datum
      })
      return {paymentMethods}
    },
    async feeds(_, args, {pgdb, req}) {
      return pgdb.public.feeds.find()
    },
    async feed(_, args, {pgdb}) {
      return pgdb.public.feeds.findOne( args )
    },
    async votings(_, args, {pgdb, req}) {
      return pgdb.public.votings.find()
    },
    async voting(_, args, {pgdb}) {
      return pgdb.public.votings.findOne( args )
    },
  }),

  User: {
    name (user) {
      return [user.firstName, user.lastName].join(' ')
    },
    async address(user, args, {pgdb}) {
      if(!user.addressId) return null
      return pgdb.public.addresses.findOne({id: user.addressId})
    },
    async memberships(user, args, {pgdb}) {
      return pgdb.public.memberships.find({userId: user.id})
    },
    async pledges(user, args, {pgdb}) {
      return pgdb.public.pledges.find({userId: user.id})
    },
    async testimonial(user, args, {pgdb}) {
      const testimonial = await pgdb.public.testimonials.findOne({userId: user.id})
      if (testimonial) {
        return Object.assign({}, testimonial, {
          name: `${user.firstName} ${user.lastName}`
        })
      }
      return null
    }
  },
  Testimonial: {
    image (testimonial, {size}) {
      let image = testimonial.image
      if (size === 'SHARE') {
        image = image.replace('384x384.jpeg', '1000x1000.jpeg')
      }
      return image
    }
  },
  Crowdfunding: {
    async packages(crowdfunding, args, {pgdb}) {
      return pgdb.public.packages.find( {crowdfundingId: crowdfunding.id} )
    },
    async goals(crowdfunding, args, {pgdb}) {
      return pgdb.public.crowdfundingGoals.find({crowdfundingId: crowdfunding.id}, {
        orderBy: ['people asc', 'money asc']
      })
    },
    async status(crowdfunding, args, {pgdb}) {
      const money = await pgdb.public.queryOneField(`SELECT SUM(total) FROM pledges WHERE status = 'SUCCESSFUL'`) || 0
      const people = await pgdb.public.queryOneField(`SELECT COUNT(id) FROM memberships`) || 0
      return {money, people}
    }
  },
  Package: {
    async options(package_, args, {pgdb}) {
      return pgdb.public.packageOptions.find( {packageId: package_.id} )
    }
  },
  PackageOption: {
    async reward(packageOption, args, {pgdb}) {
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
    async options(pledge, args, {pgdb}) {
      //we augment pledgeOptions with packageOptions
      const pledgeOptions = await pgdb.public.pledgeOptions.find( {pledgeId: pledge.id} )
      if(!pledgeOptions.length) return []
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
    async package(pledge, args, {pgdb}) {
      return pgdb.public.packages.findOne({id: pledge.packageId})
    },
    async user(pledge, args, {pgdb, t}) {
      return pgdb.public.users.findOne({id: pledge.userId})
    },
    async payments(pledge, args, {pgdb}) {
      const pledgePayments = await pgdb.public.pledgePayments.find({pledgeId: pledge.id})
      return pledgePayments.length
        ? pgdb.public.payments.find({id: pledgePayments.map( (pp) => { return pp.paymentId })})
        : []
    },
    async memberships(pledge, args, {pgdb}) {
      const memberships = await pgdb.public.memberships.find({pledgeId: pledge.id})
      if(!memberships.length) return []
      //augment memberships with claimer's names
      const users = await pgdb.public.users.find({id: memberships.map( m => m.userId )})
      return memberships.map( membership => {
        if(membership.userId != pledge.userId) { //membership was vouchered to somebody else
          const user = users.find( u => u.id === membership.userId )
          return Object.assign({}, membership, {
            claimerName: user.firstName+' '+user.lastName
          })
        }
        return membership
      })
    }
  },
  Membership: {
    async type(membership, args, {pgdb}) {
      return pgdb.public.membershipTypes.findOne({id: membership.membershipTypeId})
    }
  },
  MembershipStats: {
    async createdAts(_, {interval}, {pgdb}) {
      return pgdb.query(`
        SELECT
          date_trunc('${interval}', "createdAt") AS datetime,
          count(*) AS count
        FROM memberships
        GROUP BY 1
        ORDER BY 1 ASC
      `)
    },
    async ages(_, args, {pgdb}) {
      return pgdb.query(`
        SELECT
          extract(year from age(birthday)) AS age,
          count(distinct u.id) AS count
        FROM users u
        JOIN
          memberships m
          ON m."userId" = u.id
        GROUP BY 1
        ORDER BY 1
      `)
    },
    async countries(_, args, {pgdb, membershipStatsCountriesCache}) {
      const result = membershipStatsCountriesCache.get('all')
      if(result) {
        return result
      }

      const countries = await pgdb.query(`
        SELECT
          lower(trim(a.country)) as name,
          trim(a."postalCode") as "postalCode",
          count(distinct u.id) AS count
        FROM memberships m
        JOIN users u
          ON m."userId" = u.id
        LEFT JOIN addresses a
          ON u."addressId" = a.id
        GROUP BY a."postalCode", a.country
        ORDER BY count DESC
      `)

      const countriesWithPostalCodes = nest()
        .key(d => countryNameNormalizer(d.name))
        .entries(countries)
        .map(datum => {
          const country = countryDetailsForName(datum.key)
          const hasPostalCodes = country
            ? hasPostalCodesForCountry(country.code)
            : false
          let postalCodes = []
          let unkownCount = 0
          if (!hasPostalCodes) {
            unkownCount = datum.values.reduce(
              (sum, row) => row.count,
              0
            )
          } else {
            const pcParser = country
              ? postalCodeParsers[country.code]
              : null

            datum.values.forEach(row => {
              const postalCode = pcParser
                ? pcParser(row.postalCode)
                : row.postalCode

              const baseData = postalCodeData(country.code, postalCode)
              if (baseData) {
                postalCodes.push({
                  postalCode: baseData.code,
                  name: baseData.name,
                  lat: baseData.lat,
                  lon: baseData.lon,
                  count: row.count,
                  state: baseData.state,
                  stateAbbr: baseData.stateAbbr
                })
              } else {
                unkownCount += row.count
              }
            })

            if (pcParser) {
              postalCodes = nest()
                .key(d => d.postalCode)
                .rollup(values => Object.assign({}, values[0], {
                  count: values.reduce(
                    (sum, d) => sum + d.count,
                    0
                  )
                }))
                .entries(postalCodes)
                .map(d => d.value)
            }
          }
          if (unkownCount) {
            const {lat, lon} = country
              ? {lat: country.lat, lon: country.lon}
              : {lat: 0, lon: 0}
            postalCodes.push({
              postalCode: null,
              name: null,
              lat,
              lon,
              count: unkownCount
            })
          }


          return {
            name: datum.key === 'null'
              ? null
              : datum.key,
            postalCodes,
            states () {
              return nest()
                .key(d => d.stateAbbr || undefined)
                .rollup(values => ({
                  name: values[0].state || null,
                  abbr: values[0].stateAbbr || null,
                  count: values.reduce(
                    (sum, d) => sum + d.count,
                    0
                  )
                }))
                .entries(postalCodes)
                .map(d => d.value)
            },
            count: datum.values.reduce((acc, currentValue) => {
              return acc + currentValue.count
            }, 0)
          }
        })
        .sort((a, b) => (
          descending(a.count, b.count) ||
          collator.compare(a.name, b.name)
        ))

      membershipStatsCountriesCache.set('all', countriesWithPostalCodes)

      return countriesWithPostalCodes
    }
  },
  Feed: {
    async userIsEligitable(feed, args, {pgdb, user}) {
      if(!user)
        return false
      return !!(await pgdb.public.memberships.findFirst({userId: user.id}))
    },
    async userWaitUntil(feed, args, {pgdb, user}) {
      if(!user || !feed.commentInterval)
        return
      const now = new Date().getTime()
      const lastCommentByUser = await pgdb.public.comments.findFirst({
        userId: user.id,
        feedId: feed.id,
        published: true
      }, {
        orderBy: ['createdAt desc']
      })
      if(lastCommentByUser && lastCommentByUser.createdAt.getTime() > now-feed.commentInterval)
        return new Date((lastCommentByUser.createdAt.getTime()+feed.commentInterval))
      return
    },
    async comments(feed, args, {pgdb}) {
      const {offset, limit, firstId, tags, order} = args

      const firstComment = firstId
        ? await pgdb.public.comments.findOne({
            id: firstId,
            feedId: feed.id,
            published: true,
            adminUnpublished: false
          })
        : null


      let orderBy = 'hottnes DESC'
      if(order === 'NEW')
        orderBy = '"createdAt" DESC'
      if(order === 'TOP')
        orderBy = '"upVotes" - "downVotes" DESC'

      const comments = (await pgdb.public.comments.find({
        feedId: feed.id,
        published: true,
        adminUnpublished: false,
        'tags @>': tags,
        tags: (tags && tags.length === 0) ? '[]' : undefined
      }, {
        offset,
        limit,
        orderBy: [orderBy],
        skipUndefined: true
      })).map( c => Object.assign({}, c, {
        score: c.upVotes - c.downVotes
      }))

      return firstComment
        ? [firstComment].concat(comments.filter(c => c.id !== firstComment.id))
        : comments
    },
    async stats(feed, args, {pgdb}) {
      return {
        count: pgdb.public.comments.count({
          feedId: feed.id,
          published: true,
          adminUnpublished: false
        }),
        tags: [
          {
            tag: null,
            count: await pgdb.queryOneField(`
              SELECT
                count(*)
              FROM
                comments c
              WHERE
                c."feedId"=:feedId AND
                c.tags = '[]' AND
                c.published=:published AND
                c."adminUnpublished"=:adminUnpublished
            `, {
              feedId: feed.id,
              published: true,
              adminUnpublished: false,
            })
          }
        ]
          .concat(await pgdb.query(`
            SELECT
              tag as tag,
              count(*) as count
            FROM
              comments c,
              json_array_elements_text(c.tags::json) tag
            WHERE
              c."feedId"=:feedId AND
              c.published=:published AND
              c."adminUnpublished"=:adminUnpublished
            GROUP BY 1
          `, {
            feedId: feed.id,
            published: true,
            adminUnpublished: false,
          }))
          .sort((a, b) => descending(a.count, b.count))
      }
    }
  },
  Comment: {
    async authorName(comment, args, {pgdb}) {
      const user = await pgdb.public.users.findOne({id: comment.userId})
      return `${user.firstName} ${user.lastName}`
    },
    userVote(comment, args, {pgdb, user}) {
      const userId = user ? user.id : null
      const userVote = comment.votes.find( vote => vote.userId === userId )
      return !userVote ? null : (userVote.vote === 1 ? 'UP' : 'DOWN')
    },
    userCanEdit(comment, args, {pgdb, user}) {
      const userId = user ? user.id : null
      return comment.userId === userId
    },
    score(comment, args, context) {
      return comment.upVotes - comment.downVotes
    },
    async authorImage(comment, {size}, {pgdb}) {
      const testimonial = await pgdb.public.testimonials.findFirst({
        userId: comment.userId,
        published: true,
        adminUnpublished: false
      }, {
        orderBy: ['createdAt desc']
      })
      if(!testimonial)
        return null
      let image = testimonial.image
      if (size === 'SHARE') {
        image = image.replace('384x384.jpeg', '1000x1000.jpeg')
      }
      return image
    }
  },
  Voting: {
    async options(voting, args, {pgdb, user}) {
      return pgdb.public.votingOptions.find({votingId: voting.id})
    },
    async turnout(voting, args, {pgdb, user}) {
      return {
        eligitable: pgdb.queryOneField(`SELECT count(distinct("userId")) FROM memberships`),
        submitted: pgdb.public.ballots.count({votingId: voting.id})
      }
    },
    async userIsEligitable(voting, args, {pgdb, user}) {
      if(!user)
        return false
      return !!(await pgdb.public.memberships.findFirst({userId: user.id}))
    },
    async userHasSubmitted(voting, args, {pgdb, user}) {
      if(!user)
        return false
      return !!(await pgdb.public.ballots.findFirst({
        userId: user.id,
        votingId: voting.id
      }))
    },
  },
  VoteResult: {
    async stats(result, args, {pgdb}) {
      return {}
    }
  },
  VoteStats: {
    async ages(_, args, {pgdb}) {
      //no access to voting here, we have one voting and no time: don't constrain to votingId

      //others (no birthday)
      const nullOptions = await pgdb.query(`
        SELECT
          vo.id AS id,
          vo.name AS name,
          COUNT(b."votingOptionId") AS count
        FROM
          "votingOptions" vo
        LEFT JOIN
          ballots b
          ON vo.id=b."votingOptionId"
        LEFT JOIN
          users u
          ON b."userId"=u.id
        WHERE
          u.birthday is null
        GROUP BY
          1, 2
        ORDER BY
          3 DESC
      `)
      const maxNullOptions = nullOptions.reduce(
        (prev, current) => prev.count > current.count ? prev : current
      )
      const nullStatsCount = {
        key: 'null',
        options: nullOptions.map( o => Object.assign({}, o, {
          winner: o.count === maxNullOptions.count
        })),
        count: nullOptions.reduce(
          (sum, o) => sum + o.count,
          0
        )
      }

      const ageGroups = [
        {min: 0, max: 19},
        {min: 20, max: 29},
        {min: 30, max: 39},
        {min: 40, max: 49},
        {min: 50, max: 59},
        {min: 60, max: 69},
        {min: 70, max: 79},
        {min: 80, max: 99999}
      ]

      const statsCounts = ageGroups.map( async (ageGroup) => {
        const options = await pgdb.query(`
          SELECT
            vo.id AS id,
            vo.name AS name,
            COUNT(b."votingOptionId") AS count
          FROM
            "votingOptions" vo
          LEFT JOIN
            ballots b
            ON vo.id=b."votingOptionId"
          LEFT JOIN
            users u
            ON b."userId"=u.id
          WHERE
            u.birthday is not null AND
            extract(year from age(u.birthday)) >= :minAge AND
            extract(year from age(u.birthday)) <= :maxAge
          GROUP BY
            1, 2
          ORDER BY
            3 DESC
        `, {
          minAge: ageGroup.min,
          maxAge: ageGroup.max
        })
        let maxOption
        if(options.length) {
          maxOption = options.reduce(
            (prev, current) => prev.count > current.count ? prev : current
          )
        }
        return {
          key: `${ageGroup.min}-${ageGroup.max}`,
          options: options.map( o => Object.assign({}, o, {
            winner: maxOption ? o.count === maxOption.count : false
          })),
          count: options.reduce(
            (sum, o) => sum + o.count,
            0
          )
        }
      })

      return [nullStatsCount].concat(statsCounts)
    },
    async countries(_, args, {pgdb}) {
      const allCountriesVotingOptions = await pgdb.query(`
        SELECT
          "countryName",
          id,
          name,
          count
        FROM (
          SELECT
            lower(trim(a.country)) AS "countryName",
            array_agg(b.id) AS ballot_ids
          FROM
            users u
          JOIN
            ballots b
            ON b."userId"=u.id
          LEFT JOIN
            addresses a
            ON u."addressId" = a.id
          GROUP BY
            1
          ORDER BY
            1
        ) e1 JOIN LATERAL (
          SELECT
            vo.id AS id,
            vo.name AS name,
            COUNT(b."votingOptionId") AS count
          FROM
            "votingOptions" vo
          LEFT JOIN
            ballots b
            ON
              vo.id=b."votingOptionId" AND
              ARRAY[b.id] && e1.ballot_ids
          GROUP BY
            1, 2
          ORDER BY
            3 DESC
        ) e2 ON true;
      `)

      const reduceOptions = (entries) =>
        nest()
          .key( o => o.name )
          .rollup( values => ({
            name: values[0].name,
            id: values[0].id,
            count: values.reduce(
              (sum, v) => sum + v.count,
              0
            )
          }))
          .entries(entries)
          .map( o => ({
            key: o.key,
            name: o.value.name,
            id: o.value.id,
            count: o.value.count
          }))

      const nullCountryOptions = {
        key: 'null',
        options: allCountriesVotingOptions.filter( o => o.countryName === null )
      }

      const countryOptions = nest()
        .key( d => countryNameNormalizer(d.countryName))
        .entries(allCountriesVotingOptions.filter( d => d.countryName !== null))
        .map( d => ({
          key: d.key,
          options: reduceOptions(d.values)
        }))

      let designatedCountryOptions = []
      let otherCountryOptions = []
      countryOptions.forEach( c => {
        const total = c.options.reduce(
          (sum, v) => sum + v.count,
          0
        )
        if(total >= 7)
          designatedCountryOptions.push(c)
        else
          otherCountryOptions.push(c)
      })

      const combinedOtherCountryOptions = {
        key: 'others',
        options: reduceOptions( [].concat.apply([], otherCountryOptions.map( d => d.options) ) )
      }

      const keyOrder = (key) => {
        switch (key) {
          case 'others':
            return -1
          case 'null':
            return -2
          default:
            return 0
        }
      }
      const allCountryOptions = [].concat(designatedCountryOptions, combinedOtherCountryOptions, nullCountryOptions)
        .map( c => {
          const optionCountMax = c.options.map(o => o.count).reduce(
            (prev, current) => prev > current ? prev : current,
            0
          )
          return Object.assign({}, c, {
            count: c.options.reduce(
              (sum, v) => sum + v.count,
              0
            ),
            options: c.options
              .map( o => Object.assign({}, o, {
                winner: o.count === optionCountMax
              }))
              .sort((a, b) => descending(a.count, b.count))
          })
        })
        .sort((a, b) => (
          descending(keyOrder(a.key), keyOrder(b.key)) ||
          descending(a.count, b.count)
        ))

      return allCountryOptions
    },
    async chCantons(_, args, {pgdb}) {
      const allCountriesWithPostalCodesVotingOptions = await pgdb.query(`
        SELECT
          "countryName",
            "postalCode",
            id,
            name,
            count
        FROM (
            SELECT
              lower(trim(a.country)) AS "countryName",
              trim(a."postalCode") as "postalCode",
              array_agg(b.id) AS ballot_ids
            FROM
              users u
            JOIN
              ballots b
              ON b."userId"=u.id
            LEFT JOIN
              addresses a
              ON u."addressId" = a.id
            GROUP BY
              1, 2
            ORDER BY
              2
        ) e1 JOIN LATERAL (
            SELECT
              vo.id AS id,
              vo.name AS name,
              COUNT(b."votingOptionId") AS count
            FROM
              "votingOptions" vo
            LEFT JOIN
              ballots b
              ON
                vo.id=b."votingOptionId" AND
                ARRAY[b.id] && e1.ballot_ids
            GROUP BY
              1, 2
            ORDER BY
              3 DESC
        ) e2 ON true;
      `)

      const pcParser = postalCodeParsers['CH']

      const reduceOptions = (entries) =>
        nest()
          .key( o => o.name )
          .rollup( values => ({
            name: values[0].name,
            id: values[0].id,
            count: values.reduce(
              (sum, v) => sum + v.count,
              0
            )
          }))
          .entries(entries)
          .map( o => ({
            name: o.value.name,
            id: o.value.id,
            count: o.value.count
          }))

      const switzerlandOptions = nest()
        .key( d => countryNameNormalizer(d.countryName))
        .entries(allCountriesWithPostalCodesVotingOptions.filter( d => d.countryName !== null))
        .filter( d => d.key === 'Schweiz')[0]

      const postalCodeOptions = nest()
        .key( d => pcParser(d.postalCode))
        .entries(switzerlandOptions.values)
        .map( d => {
          const baseData = postalCodeData('CH', d.key)
          return {
            key: baseData
                 ? baseData.state
                 : 'others',
            options: reduceOptions(d.values)
          }
        })

      const keyOrder = (key) => {
        switch (key) {
          case 'others':
            return -1
          case 'null':
            return -2
          default:
            return 0
        }
      }
      const stateOptions = nest()
        .key( c => c.key)
        .entries(postalCodeOptions)
        .map( c => ({
          key: c.key,
          options: reduceOptions( [].concat.apply([], c.values.map( d => d.options) ) )
        }))
        .map( c => {
          const optionCountMax = c.options.map(o => o.count).reduce(
            (prev, current) => prev > current ? prev : current,
            0
          )
          return Object.assign({}, c, {
            count: c.options.reduce(
              (sum, v) => sum + v.count,
              0
            ),
            options: c.options
              .map( o => Object.assign({}, o, {
                winner: o.count === optionCountMax
              }))
              .sort((a, b) => descending(a.count, b.count))
          })
        })
        .sort((a, b) => (
          descending(keyOrder(a.key), keyOrder(b.key)) ||
          descending(a.count, b.count)
        ))

      return stateOptions
    },
  },

  RootMutation: mutations
}

module.exports = resolveFunctions
