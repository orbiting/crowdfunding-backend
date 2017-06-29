module.exports = {
  async authorName(comment, args, {pgdb}) {
    const user = await pgdb.public.users.findOne({id: comment.userId})
    return `${user.firstName} ${user.lastName}`
  },
  userVote(comment, args, {user}) {
    const userId = user ? user.id : null
    const userVote = comment.votes.find( vote => vote.userId === userId )
    return !userVote ? null : (userVote.vote === 1 ? 'UP' : 'DOWN')
  },
  userCanEdit(comment, args, {user}) {
    const userId = user ? user.id : null
    return comment.userId === userId
  },
  score(comment, args) {
    return comment.upVotes - comment.downVotes
  },
  async authorImage(comment, {size}, {pgdb}) {
    const testimonial = await pgdb.public.testimonials.findFirst({
      userId: comment.userId,
      published: true,
      adminUnpublished: false
    }, {
      orderBy: ['createdAt desc']
    })
    if(!testimonial)
      return null
    let image = testimonial.image
    if (size === 'SHARE') {
      image = image.replace('384x384.jpeg', '1000x1000.jpeg')
    }
    return image
  }
}
