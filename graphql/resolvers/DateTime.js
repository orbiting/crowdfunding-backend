const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')

module.exports = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime (format ISO-8601)',
  parseValue(value) {
    return new Date(value)
  },
  serialize(value) {
    if((typeof value) === 'string') {
      value = new Date(value)
    }
    return value.toISOString()
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value)
    }
    return null
  },
})
