module.exports = async (_, args, {pgdb, t}) => {
  const {sequenceNumber, orderBy} = args
  const isAsc = orderBy === 'ASC'
  const testimonial = await pgdb.query(`
    SELECT
      t.*,
      concat_ws(' ', u."firstName"::text, u."lastName"::text) as name
    FROM
      testimonials t
    JOIN
      users u
      ON t."userId" = u.id
    WHERE
      t."sequenceNumber" ${isAsc ? '>' : '<'} :sequenceNumber
    ORDER BY t."sequenceNumber" ${isAsc ? 'ASC' : 'DESC'}
    LIMIT 1
  `, {
    sequenceNumber: sequenceNumber
  })
  if(testimonial[0]) {
    return testimonial[0]
  }
  throw new Error(t('api/testimonial/notFound'))
}