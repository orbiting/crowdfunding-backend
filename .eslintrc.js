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
