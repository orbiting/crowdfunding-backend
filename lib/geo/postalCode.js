const nest = require('d3-collection').nest

const postalCodesByCountries = require('../../assets/geography/postalCodes/postalCodesByCountries.json')

exports.hasPostalCodesForCountry = countryCode =>
  !!postalCodesByCountries.find( d => d.country === countryCode )

exports.postalCodeData = (countryCode, postalCode) => {
  const country = postalCodesByCountries.find( d => d.country === countryCode )
  if(country)
    return country.postalCodes.find( d => d.code === postalCode )
  return
}

exports.parsers = {
  Schweiz: code => parseInt(code
    .replace(/^CH[\s-]*/i, '')
  ).toString(),
  Deutschland: code => code
    .replace(/^D[\s-]*/i, '')
    .split(' ')[0],
  'Österreich': code => code
    .replace(/^A[\s-]*/i, '')
    .split(' ')[0]
}
