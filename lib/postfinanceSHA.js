const crypto = require('crypto')
const {ascending} = require('d3-array')

module.exports = ({orderId, amount, alias, userId}) => {
  const {PUBLIC_BASE_URL, PF_PSPID, PF_INPUT_SECRET} = process.env

  const params = [
    {
      key: 'PSPID',
      value: PF_PSPID
    },
    {
      key: 'ORDERID',
      value: orderId || ''
    },
    {
      key: 'AMOUNT',
      value: amount || ''
    },
    {
      key: 'CURRENCY',
      value: 'CHF'
    },
    {
      key: 'LANGUAGE',
      value: 'de_DE'
    },
    {
      key: 'PM',
      value: 'PostFinance Card'
    },
    {
      key: 'BRAND',
      value: 'PostFinance Card'
    },
    {
      key: 'ACCEPTURL',
      value: `${PUBLIC_BASE_URL}/pledge`
    },
    {
      key: 'EXCEPTIONURL',
      value: `${PUBLIC_BASE_URL}/pledge`
    },
    {
      key: 'DECLINEURL',
      value: `${PUBLIC_BASE_URL}/pledge`
    },
    {
      key: 'CANCELURL',
      value: `${PUBLIC_BASE_URL}/pledge`
    },
    {
      key: 'ALIAS',
      value: alias || ''
    },
    {
      key: 'USERID',
      value: userId || ''
    },
    {
      key: 'ALIASUSAGE',
      value: 'membership'
    }
  ]
  // ensure correct order for valid sha1
  params.sort((a, b) => ascending(a.key, b.key))

  const paramsString = params.map(param => (
    `${param.key}=${param.value}${PF_INPUT_SECRET}`
  )).join('')

  return crypto.createHash('sha1').update(paramsString).digest('hex').toUpperCase()
}
