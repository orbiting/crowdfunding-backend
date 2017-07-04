module.exports = async (_, args, {pgdb}) => {
  return {
    count: await pgdb.public.testimonials.count({
      published: true,
      adminUnpublished: false
    }),
    // has pledge and/or was vouchered a membership
    // check graphql/resolvers/RootMutations/submitTestimonial.js
    eligitable: await pgdb.queryOneField(`
      SELECT
        COUNT(*)
      FROM (
          SELECT
            "userId"
          FROM
            pledges
        UNION
          SELECT
            "userId"
          FROM
            memberships
      ) t
    `)
  }
}
