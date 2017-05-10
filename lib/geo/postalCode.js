const nest = require('d3-collection').nest

// ToDo: Refactor to country definitions with all in one object
exports.data = {
  // handle postalCodes with two names
  Schweiz: nest()
    .key(d => d.code)
    .rollup(leaves => Object.assign({}, leaves[0], {
      name: leaves.map(d => d.name).join(' / ')
    }))
    .object(require('../../assets/geography/postalCodes/CH.json')),
  Deutschland: nest()
    .key(d => d.code)
    .rollup(leaves => Object.assign({}, leaves[0], {
      name: leaves.map(d => d.name).join(' / ')
    }))
    .object(require('../../assets/geography/postalCodes/DE.json')),
  'Österreich': nest()
    .key(d => d.code)
    .rollup(leaves => Object.assign({}, leaves[0], {
      name: leaves.map(d => d.name).join(' / ')
    }))
    .object(require('../../assets/geography/postalCodes/AT.json'))
}


exports.parsers = {
  Schweiz: code => parseInt(code
    .replace(/^CH[\s-]*/i, '')
  ).toString(),
  Deutschland: code => code
    .replace(/^D[\s-]*/i, '')
    .split(' ')[0],
  'Österreich': code => code
    .replace(/^A[\s-]*/i, '')
    .split(' ')[0]
}
