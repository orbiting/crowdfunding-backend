const { graphql } = require('graphql')
const { PgDb } = require('pogi')
require('dotenv').config()

const Schema = require('../schema')
const Resolvers = require('../resolvers')
const {makeExecutableSchema} = require('graphql-tools')
const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers
})


let pgdb = null
beforeAll( async () => {
  pgdb = await PgDb.connect({connectionString: process.env.DATABASE_URL})
  return
})

beforeEach( () => {
  const {users} = pgdb.public
  users.delete()
  return
})



const mock = {
  user: {
    id: 5,
    email: 'p@tte.io',
    createdAt: new Date,
    createdAt: new Date,
    pledges: [],
    memberships: []
  },
  admin: {
    id: 8,
    email: 'patrick.recher@project-r.construction',
    isAdmin: true,
    createdAt: new Date,
    createdAt: new Date,
    pledges: [],
    memberships: []
  }
}


it('should be null when user is not logged in', async () => {
  const query = `
    query Q {
      me {
        name
      }
    }
  `;

  const rootValue = {}
  const context = {}

  const result = await graphql(executableSchema, query, rootValue, context)
  const { data } = result

  expect(data.me).toBe(null)
})

it('should return the user when logged in', async () => {
  const query = `
    query Q {
      me {
        email
      }
    }
  `;

  const rootValue = {}
  const context = {
    user: mock.user
  }

  const result = await graphql(executableSchema, query, rootValue, context)
  const {data:{me}} = result

  expect(me.email).toBe(context.user.email)
})
