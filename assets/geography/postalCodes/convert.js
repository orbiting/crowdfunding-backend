//
// This script takes allCountries.txt from http://download.geonames.org/export/zip/
// and converts it into separate json files for each country
//
// usage
// download allCountries.txt and place it beside this script
// cf_server  node assets/geography/postalCodes

const rw = require('rw')

//EU + CH
const countriesOfInterest = [
  'BE', 'EL', 'LT', 'PT',
  'BG', 'ES', 'LU', 'RO',
  'CZ', 'FR', 'HU', 'SI',
  'DK', 'HR', 'MT', 'SK',
  'DE', 'IT', 'NL', 'FI',
  'EE', 'CY', 'AT', 'SE',
  'IE', 'LV', 'PL', 'UK', 'CH'
]

// source
const input = rw.readFileSync(
  __dirname + '/allCountries.txt',
  'utf8'
)

const allCountries = require('d3-dsv')
  .tsvParse('country\tcode\tname\tstate\tstateAbbr\tname2\tcode2\tname3\tcode3\tlat\tlon\n' + input)
  .map(d => ({
    country: d.country,
    code: d.code,
    name: d.name,
    state: d.state,
    stateAbbr: d.stateAbbr,
    lat: +d.lat,
    lon: +d.lon
  }))


countriesOfInterest.forEach( code => {
  const content = allCountries.filter( d => d.country === code )
  if (content.length) {
    rw.writeFileSync(`${__dirname}/${code}.json`,
      JSON.stringify(content, null, 2),
      'utf8'
    )
  } else {
    console.log("no data found for: " + code)
  }
})
