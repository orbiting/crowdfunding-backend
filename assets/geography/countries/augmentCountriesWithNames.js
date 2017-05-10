//
// This script augments countries.json (see getCountries.js)
// with the name in german, searchSearch names (name in en,
// de and the the countries languages), some manual name-fixes
// and saves a cleaned countriesWithNames.json
// data based on alternateNames.txt from http://download.geonames.org/export/dump/
// format
// [ {
//    "code": "CH",
//    "name": "Schweiz",
//    "searchNames": [
//      "Schweizerische Eidgenossenschaft",
//      "Confédération Suisse",
//      "Confederazione Svizzera",
//      "Schweiz",
//      "Switzerland",
//      "Suisse",
//      "Svizzera",
//      "Svizra",
//      "Ch"
//    ],
//    "lat": "47.00016",
//    "lon": "8.01427"
//  } ]
//
// usage
// download alternateNames.txt and place it along side this script
// cf_server  node assets/geography/countries/augmentCountriesWithNames.js

const fetch = require('isomorphic-unfetch')
const fs = require('fs')
const stream = require('stream')
const es = require('event-stream')

Promise.resolve().then( async () => {

  let countries = require('./countries.json')
  const geonameIds = countries.map( c => c.geonameId )

  const manualNames = [
    { code: 'MM',
      name: 'Burma (Myanmar)' },
  ]

  await new Promise( (resolve, reject) => {
    const s = fs.createReadStream(__dirname+'/alternateNames.txt')
      .pipe(es.split())
      .pipe(es.mapSync(function(line){
        // pause the readstream
        s.pause()

        const row = require('d3-dsv')
          .tsvParse('alternateNameId\tgeonameId\tisoLaguage\talternateName\n' + line)[0]

        if(row && row.isoLaguage && row.geonameId) {
          const geonameId = parseInt(row.geonameId)
          if(geonameIds.indexOf(geonameId) > -1) {
            let country = countries.find( c => c.geonameId === geonameId )
            if(row.isoLaguage === 'de') {
              const manualName = manualNames.find( name => name.code === country.code)
              if(manualName)
                country.name = manualName.name
              else
                country.name = row.alternateName.replace(/ß/g, 'ss') //de-CH
            }
            if( (row.isoLaguage === 'de' ||
                 row.isoLaguage === 'en' ||
                 country.languages.indexOf(row.isoLaguage) > -1) &&
                country.searchNames.indexOf(row.alternateName) === -1
            ) {
              country.searchNames.push(row.alternateName)
              if(row.alternateName.indexOf('ß') > -1) {
                const deCHName = row.alternateName.replace(/ß/g, 'ss')
                if(country.searchNames.indexOf(deCHName) === -1) {
                  country.searchNames.push(deCHName)
                }
              }
            }
          }
        }

        // resume the readstream, possibly from a callback
        s.resume()
      }))
    s.on('end', function() {
      resolve()
    })
  })

  const manualSearchNames = [
    { code: 'CH',
      searchNames: ['Ch'] },
    { code: 'DE',
      searchNames: ['Brd', 'D'] },
    { code: 'GB',
      searchNames: ['Uk'] },
    { code: 'ES',
      searchNames: ['España / Cádiz'] },
    { code: 'DK',
      searchNames: ['Daenemark'] },
    { code: 'NL',
      searchNames: ['Die Niederlande'] }
  ]
  countries = countries.map( country => {
    const manualName = manualSearchNames.find( name => name.code === country.code )
    const searchNames = manualName
      ? country.searchNames.concat(manualName.searchNames)
      : country.searchNames
    return {
      code: country.code,
      name: country.name,
      searchNames,
      lat: country.lat,
      lon: country.lon
    }
  })

  fs.writeFileSync(`${__dirname}/countriesWithNames.json`,
    JSON.stringify(countries, null, 2),
    'utf8'
  )

}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
