import Sequelize from 'sequelize'

const db = new Sequelize(process.env.USERS_DB_URL)

const UserModel = db.define('user', {
  name: { type: Sequelize.STRING },
  email: { type: Sequelize.STRING },
})

const RoleModel = db.define('role', {
  name: { type: Sequelize.STRING },
  description: { type: Sequelize.STRING },
})

UserModel.belongsToMany(RoleModel, {through: 'user_role'})
RoleModel.belongsToMany(UserModel, {through: 'user_role'})



db.sync().then( () => {
  console.log("DB synced! ")
  const Role = db.models.role
  const User = db.models.user
  Role.findAll().then( (roles) => {
    if(roles.length===0) {
      Role.create({
        name: "admin",
        description: "admins are king"
      }).then( (role) => {
        User.create({
          name: "Patrick Recher",
          email: "patrick.recher@project-r.construction",
        }).then( (user) => {
          user.addRole(role)
        })
      })
      Role.create({
        name: "writers",
        description: "write stories"
      })
    }
  })
})

const User = db.models.user
const Role = db.models.role

export { User, Role }
