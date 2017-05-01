module.exports = async (_, args, {pgdb}) => {
  const {interval} = args
  //somehow pogi's parameters don't work here
  return pgdb.query(`
    SELECT
      date_trunc('${interval}', "createdAt") AS datetime,
      count(*) AS value
      FROM memberships
      GROUP BY date_trunc('${interval}', "createdAt")
      ORDER BY date_trunc('${interval}', "createdAt") ASC
  `)
}
