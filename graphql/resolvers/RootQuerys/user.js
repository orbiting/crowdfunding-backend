module.exports = async (_, { id }, { pgdb }) => {
  return pgdb.public.users.findOne({ id })
}
