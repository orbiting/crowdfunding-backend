//
// This script augments countries.json (see getCountries.js)
// with the name in german, the names by the countries languages
// and saves a cleaned countriesWithNames.json
// data based on alternateNames.txt from http://download.geonames.org/export/dump/
// format
// [ {
//    "code": "CH",
//    "names": {
//      "en": "Switzerland",
//      "de": "Schweiz"
//    },
//    "searchNames": [
//      "Schweizerische Eidgenossenschaft",
//      "Confédération Suisse",
//      "Confederazione Svizzera",
//      "Schweiz",
//      "Suisse",
//      "Svizzera",
//      "Svizra"
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
              country.names.de = row.alternateName
            }
            if(country.languages.indexOf(row.isoLaguage) > -1 &&
              country.searchNames.indexOf(row.alternateName) === -1) {
              country.searchNames.push(row.alternateName)
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

  countries = countries.map( country => {
    return {
      code: country.code,
      names: country.names,
      searchNames: country.searchNames,
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
