const dict = require('../assets/nouns/de.js');

module.exports = function() {
  return dict[randomInt(0, dict.length - 1)]
}

function randomInt (low, high) {
  return Math.floor(Math.random() * (high - low + 1) + low);
}
