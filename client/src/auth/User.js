class User {

  /**
   * Authenticate a user. Save a user dict in Local Storage
   *
   * @param {object} user
   */
  static save(user) {
    localStorage.setItem('user', JSON.stringify(user))
  }

  /**
   * Deauthenticate a user. Remove a user from Local Storage.
   *
   */
  static remove() {
    localStorage.removeItem('user')
  }

  /**
   * Get a user.
   *
   * @returns {object}
   */
  static get() {
    var user = localStorage.getItem('user')
    if(user) {
      try {
        user = JSON.parse(user)
      } catch(e) {
        user = null
        localStorage.removeItem('user')
      }
    }
    return user
  }
}

export default User
