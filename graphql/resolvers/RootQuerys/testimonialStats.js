module.exports = async (_, args, {pgdb}) => {
  return {
    count: await pgdb.public.testimonials.count({
      published: true,
      adminUnpublished: false
    })
  }
}
