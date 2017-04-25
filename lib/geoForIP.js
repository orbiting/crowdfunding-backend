const geoipDatabase = require('geoip-database')
const maxmind = require('maxmind')
const cityLookup = maxmind.openSync(geoipDatabase.city)

module.exports = (ip) => {
  const geo = cityLookup.get(ip)
  let country
  try { country = geo.country.names.de } catch(e) { }
  let city
  try { city = geo.city.names.de } catch(e) { }
  if(!country && !city) {
    return null
  }
  if(city) {
    return city+', '+country
  }
  if(country === 'Schweiz') {
    return 'der '+country
  }
  return country
}
