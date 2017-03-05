const bodyParser = require('body-parser')

module.exports = (server, pgdb) => {

  server.post('/raisenow',
    bodyParser.urlencoded({ extended: true }),
    function(req, res) {
      console.log("POST on /raisenow")
      console.log(req.body)
      res.status(200).end()
    })

}
