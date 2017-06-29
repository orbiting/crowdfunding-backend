module.exports = {
  name (user) {
    return [user.firstName, user.lastName].join(' ')
  },
  async address(user, args, {pgdb}) {
    if(!user.addressId) return null
    return pgdb.public.addresses.findOne({id: user.addressId})
  },
  async memberships(user, args, {pgdb}) {
    return pgdb.public.memberships.find({userId: user.id})
  },
  async pledges(user, args, {pgdb}) {
    return pgdb.public.pledges.find({userId: user.id})
  },
  async testimonial(user, args, {pgdb}) {
    const testimonial = await pgdb.public.testimonials.findOne({userId: user.id})
    if (testimonial) {
      return Object.assign({}, testimonial, {
        name: `${user.firstName} ${user.lastName}`
      })
    }
    return null
  }
}
