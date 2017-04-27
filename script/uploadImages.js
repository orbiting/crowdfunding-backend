require('dotenv').config()
const fs = require('mz/fs')
const uploadExoscale = require('../lib/uploadExoscale')
const convertImage = require('../lib/convertImage')
const slugify = require('../lib/slugify')

const FOLDER = 'images'
const IMAGES_DIR = __dirname+'/data/images/'
const IMAGES_WIDTH = 1200

const {S3BUCKET, ASSETS_BASE_URL} = process.env

Promise.resolve().then( async () => {
  const files = await fs.readdir(IMAGES_DIR)

  let urls = []
  for(let filename of files) {
    if(filename[0] !== '.' &&
      !(await fs.stat(IMAGES_DIR+filename)).isDirectory()) {

      const image = fs.readFileSync(IMAGES_DIR+filename, 'binary')
      const inputBuffer = new Buffer(image, 'binary')

      const slug = slugify(filename.substr(0, filename.lastIndexOf('.')))
      const path = `/${FOLDER}/${slug}.jpeg`
      urls.push(ASSETS_BASE_URL+path)
      console.log('uploading: '+filename)

      await convertImage.toWidth(inputBuffer, IMAGES_WIDTH)
        .then( async (data) => {
          await uploadExoscale({
            stream: data,
            path: path,
            mimeType: 'image/jpeg',
            bucket: S3BUCKET
          })
        })
    }
  }
  console.log('\nHurrah! These are your new image urls:')
  console.log(urls.join('\n'))
}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
