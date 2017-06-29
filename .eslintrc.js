module.exports = {
  "env": {
    "es6": true,
    "node": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 8
  },
  "plugins": [
    "import"
  ],
  "rules": {
    //"indent": [
    //  "error",
    //  2
    //],
    //"linebreak-style": [
    //  "error",
    //  "unix"
    //],
    //"quotes": [
    //  "error",
    //  "single"
    //],
    //"semi": [
    //  "error",
    //  "never"
    //],
    "no-console": 0,
    "func-style": [
      "error",
      "declaration", { "allowArrowFunctions": true }
    ],
    "import/no-unresolved": [
      2,
      { "commonjs": true }
    ]
  }
};
