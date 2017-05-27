const {postalCodeData, postalCodeParsers} = require('../../../lib/geo/postalCode')
const countryNameNormalizer = require('../../../lib/geo/country').nameNormalizer
const nest = require('d3-collection').nest
const {descending} = require('d3-array')

module.exports = {
  ages: async (_, args, {pgdb}) => {
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

  countries: async (_, args, {pgdb}) => {
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

  chCantons: async (_, args, {pgdb}) => {
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
               ? baseData.stateAbbr
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
}
