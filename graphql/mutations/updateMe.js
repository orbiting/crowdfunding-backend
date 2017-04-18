const logger = require('../../lib/logger')
const ensureSignedIn = require('../../lib/ensureSignedIn')

module.exports = async (_, args, {loaders, pgdb, req, t}) => {
  ensureSignedIn(req, t)
  const {name, birthday, address} = args
  const transaction = await pgdb.transactionBegin()
  try {
    if(name || birthday) {
      const update = {}
      if(name)
        update.name = name
      if(birthday)
        update.birthday = birthday
      await transaction.public.users.update({id: req.user.id}, update)
    }
    if(address) {
      if(req.user.addressId) { //update address of user
        await transaction.public.addresses.update({id: req.user.addressId}, address)
      } else { //user has no address yet
        const userAddress = await transaction.public.addresses.insertAndGet(address)
        await transaction.public.users.update({id: req.user.id}, {addressId: userAddress.id})
      }
    }
    await transaction.transactionCommit()
    return pgdb.public.users.findOne({id: req.user.id})
  } catch(e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw new Error(t('api/unexpected'))
  }
}
