const rw = require('rw')

const input = rw.readFileSync(
  __dirname + '/postalCodesCH.txt',
  'utf8'
)
// source http://download.geonames.org/export/zip/

rw.writeFileSync(__dirname + '/postalCodesCH.json',
  JSON.stringify(
    require('d3-dsv')
      .tsvParse('country\tcode\tname\tcanton\tcantonAbbr\tname2\tcode2\tname3\tcode3\tlat\tlon\n' + input)
      .map(d => ({
        country: d.country,
        code: d.code,
        name: d.name,
        cantonAbbr: d.cantonAbbr,
        lat: +d.lat,
        lon: +d.lon
      })),
    null,
    2
  ),
  'utf8'
)
