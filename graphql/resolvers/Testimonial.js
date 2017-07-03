module.exports = {
  image (testimonial, {size}) {
    let image = testimonial.image
    if (size === 'SHARE') {
      image = image.replace('384x384.jpeg', '1000x1000.jpeg')
    }
    return image
  }
}
