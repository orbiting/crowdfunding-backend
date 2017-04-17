const geoipDatabase = require('geoip-database')
const maxmind = require('maxmind')
const cityLookup = maxmind.openSync(geoipDatabase.city)

module.exports = (ip) => {
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
