const {dsvFormat} = require('d3-dsv')
const csvParse = dsvFormat(';').parse

module.exports = (inputFile) => {
  // sanitize input
  // keys to lower case
  // trash uninteresting columns
  // parse columns
  // extract mitteilung
  const includeColumns = ['Buchungsdatum', 'Valuta', 'Avisierungstext', 'Gutschrift']
  const parseDate = ['Buchungsdatum', 'Valuta']
  const parseAmount = ['Gutschrift']
  return csvParse(inputFile)
    .filter(row => row.Gutschrift) // trash rows without gutschrift (such as lastschrift and footer)
    .filter(row => !/^EINZAHLUNGSSCHEIN/g.exec(row.Avisierungstext)) // trash useless EINZAHLUNGSSCHEIN
    .filter(row => !/^GUTSCHRIFT E-PAYMENT TRANSAKTION POSTFINANCE CARD/g.exec(row.Avisierungstext)) // trash PF CARD
    .filter(row => !/^GUTSCHRIFT VON FREMDBANK (.*?) AUFTRAGGEBER: STRIPE/g.exec(row.Avisierungstext)) // trash stripe payments
    .map(row => {
      let newRow = {}
      Object.keys(row).forEach(key => {
        const value = row[key]
        if (includeColumns.indexOf(key) > -1) {
          const newKey = key.toLowerCase()
          if (parseDate.indexOf(key) > -1) {
            newRow[newKey] = new Date(value)
          } else if (parseAmount.indexOf(key) > -1) {
            newRow[newKey] = parseInt(parseFloat(value) * 100)
          } else {
            if (key === 'Avisierungstext') {
              try {
                newRow['mitteilung'] = /.*?MITTEILUNGEN:.*?\s([A-Za-z0-9]{6})(\s.*?|$)/g.exec(value)[1]
              } catch (e) {
                // console.log("Cloud not extract mitteilung from row:")
                // console.log(row)
              }
            }
            newRow[newKey] = value
          }
        }
      })
      return newRow
    })
}
