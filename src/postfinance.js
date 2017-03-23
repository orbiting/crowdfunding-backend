const bodyParser = require('body-parser')

module.exports = (server, pgdb) => {

  server.post('/pf',
    bodyParser.urlencoded({ extended: true }),
    function(req, res) {
      console.log("POST on /pf")
      console.log(req.body)
      res.status(200).end()
    })

}
