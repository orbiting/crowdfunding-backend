const sharp = require("sharp")

const IMAGE_SIZE_SMALL = 256

module.exports.IMAGE_SIZE_SMALL = IMAGE_SIZE_SMALL

module.exports.toJPEG = (buffer) => {
  return sharp(buffer)
    .jpeg({
      quality: 100
    })
    .toBuffer()
}

module.exports.toSmallBW = (buffer) => {
  return sharp(buffer)
    .resize(IMAGE_SIZE_SMALL, IMAGE_SIZE_SMALL)
    .greyscale()
    .jpeg()
    .toBuffer()
}

