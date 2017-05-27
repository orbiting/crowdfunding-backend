const slts = require('../../assets/geography/chSlt2012/slts.json')

exports.getSlt = (bfsNr) => {
  const record = slts.find( d => d.bfs === bfsNr )
  if(record) {
    return record.slt
  }
  return
}
