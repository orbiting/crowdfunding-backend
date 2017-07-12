const {getFormatter} = require('./translate')
const MESSAGES = require('./translations.json').data
const t = getFormatter(MESSAGES)
const logger = require('./logger')

const userHasRole = (user, role) => {
  return user && user.roles && user.roles.indexOf(role) > -1
}
exports.userHasRole = userHasRole

const ensureUserHasRole = (user, role) => {
  if (!user) {
    logger.info('signIn', { stack: new Error().stack })
    throw new Error(t('api/signIn'))
  }
  if (!userHasRole(user, role)) {
    logger.info('unauthorized', { stack: new Error().stack })
    throw new Error(t('api/unauthorized', {role}))
  }
}
exports.ensureUserHasRole = ensureUserHasRole

const addUserToRole = async (userId, role, pgdb) => {
  await pgdb.query(`
    UPDATE
      users
    SET
      roles = roles || :role
    WHERE
      id = :userId AND NOT
      roles @> :role
  `, {
    role: JSON.stringify([role]),
    userId
  })
  return pgdb.public.users.findOne({id: userId})
}
exports.addUserToRole = addUserToRole

const removeUserFromRoll = async (userId, role, pgdb) => {
  await pgdb.query(`
    UPDATE
      users
    SET
      roles = roles - :role
    WHERE
      id = :userId
  `, {
    role,
    userId
  })
  return pgdb.public.users.findOne({id: userId})
}
exports.removeUserFromRoll = removeUserFromRoll
