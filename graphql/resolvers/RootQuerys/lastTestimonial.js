module.exports = async (_, args, {pgdb, t}) => {
  const testimonial = await pgdb.query(`
    SELECT
      t.*,
      concat_ws(' ', u."firstName"::text, u."lastName"::text) as name
    FROM
      testimonials t
    JOIN
      users u
      ON t."userId" = u.id
    ORDER BY
      t."createdAt" DESC
    LIMIT 1
  `)
  if (testimonial[0]) {
    return testimonial[0]
  }
  throw new Error(t('api/testimonial/notFound'))
}
