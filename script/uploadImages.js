require('dotenv').config()
const fs = require('mz/fs')
const uploadExoscale = require('../lib/uploadExoscale')
const convertImage = require('../lib/convertImage')
const slugify = require('../lib/slugify')

const FOLDER = 'images'
const IMAGES_DIR = __dirname+'/data/images/'
const IMAGES_WIDTH = 1200

const {S3BUCKET} = process.env

Promise.resolve().then( async () => {
  const files = await fs.readdir(IMAGES_DIR)
  await Promise.all(files.map( async (file) => {
    if(!(await fs.stat(IMAGES_DIR+file)).isDirectory()) {

      const image = fs.readFileSync(IMAGES_DIR+file, 'binary')
      const inputBuffer = new Buffer(image, 'binary')

      const filename = slugify(file.substr(0, file.lastIndexOf('.')))
      const path = `/${FOLDER}/${filename}.jpeg`
      console.log('uploading: '+path)

      await Promise.all([
        convertImage.toWidth(inputBuffer, IMAGES_WIDTH)
          .then( async (data) => {
            await uploadExoscale({
              stream: data,
              path: path,
              mimeType: 'image/jpeg',
              bucket: S3BUCKET
            })
          }),
      ])

    }
  }))
})
