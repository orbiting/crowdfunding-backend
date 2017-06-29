module.exports = async (_, args, {pgdb}) => {
  return pgdb.public.votings.findOne(args)
}