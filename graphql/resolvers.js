const bookshelf = require('../bookshelf')

import { GraphQLScalarType } from 'graphql'
import { Kind } from 'graphql/language'

import User from '../models/user'
import Role from '../models/role'
import Crowdfunding from '../models/crowdfunding'
import Item from '../models/item'
import Pledge from '../models/pledge'
import ItemPledge from '../models/item_pledge'


const resolveFunctions = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return new Date(value)
    },
    serialize(value) {
      return value.toISOString()
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value)
      }
      return null
    },
  }),
  RootQuery: {
    users(_, args, context, info) {
      return User
        .where(args)
        .fetchAll()
        .then( users => { return users.toJSON() })
    },
    roles(_, args) {
      return Role
        .where(args)
        .fetchAll()
        .then( roles => { return roles.toJSON() })
    },
    crowdfundings(_, args) {
      return Crowdfunding
        .where(args)
        .fetchAll()
        .then( cfs => { return cfs.toJSON() })
    },
    pledges(_, args) {
      return Pledge
        .where(args)
        //.fetchAll()
        .fetchAll({withRelated: ['itemPledges', 'user']})
        .then( pledges => { return pledges.toJSON() })
    },
  },
  User: {
    roles(user) {
      return User
        .where({id: user.id})
        .fetch({withRelated: ['roles']})
        .then( user => { return user.related('roles').toJSON() })
    }
  },
  Role: {
    users(role) {
      return Role
        .where({id: role.id})
        .fetch({withRelated: ['users']})
        .then( role => { return role.related('users').toJSON() })
    }
  },
  Crowdfunding: {
    items(crowdfunding) {
      //return Crowdfunding
      //  .where({id: crowdfunding.id})
      //  .fetch({withRelated: ['items']})
      //  .then( cf => { return cf.related('items').toJSON() })
      return Item
        .where({crowdfunding_id: crowdfunding.id})
        .fetchAll()
        .then( items => { return items.toJSON() })
    }
  },
  //not in the schema
  //Item: {
  //  crowdfunding(item) {
  //    return Crowdfunding
  //      .where({id: item.crowdfundingId})
  //      .fetch()
  //      .then( crowdfunding => { return crowdfunding.toJSON() })
  //  }
  //},
  //already resolved in RootQuery
  //Pledge: {
  //  itemPledges(pledge) {
  //    return Pledge
  //      .where({id: pledge.id})
  //      .fetch({withRelated: ['itemPledges']})
  //      .then( role => { return role.related('itemPledges').toJSON() })
  //  },
  //  user(pledge) {
  //    return Pledge
  //      .where({id: pledge.id})
  //      .fetch({withRelated: ['user']})
  //      .then( user => { return role.related('user').toJSON() })
  //  }
  //},
  ItemPledge: {
    item(itemPledge) {
      return ItemPledge
        .where({id: itemPledge.id})
        .fetch({withRelated: ['item']})
        .then( role => { return role.related('item').toJSON() })
    }
  },
  RootMutation: {
    submitPledge(numItems) {
      //FIXME numItems is undefined
      //console.log("numItems", numItems)
      const _numItems = 20;
      return User.where({email: 'patrick.recher@project-r.construction'}).fetch().then( user => {
        return Crowdfunding.where({name: 'all or nothing'}).fetch().then( cf => {
          return Item.where({name: 'one membership'}).fetch().then( item => {
            user = user.toJSON()
            cf = cf.toJSON()
            item = item.toJSON()
            return new Pledge({
              crowdfunding_id: cf.id,
              user_id: user.id,
              brutto: (item.price*_numItems),
              payed: false
            }).save().then( pledge => {
              pledge = pledge.toJSON()
              new ItemPledge({
                pledge_id: pledge.id,
                item_id: item.id,
                numItems: _numItems
              }).save().then( itemPledge => {
                //pledge.itemPledges = [itemPledge]
                return pledge
              })
            })
          })
        })
      })
    }
  }
}

module.exports = resolveFunctions
