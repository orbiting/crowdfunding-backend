import React, { PropTypes } from 'react'
import { Dropdown } from 'semantic-ui-react'
import { Link } from 'react-router'
import Session from '../session'

class AuthButton extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.state = { }
  }

  render() {
    const session = Session.getSessionStore()

    if(session && session.isLoggedIn) {
      return (
        <Dropdown text={session.user.email}>
          <Dropdown.Menu>
            <Dropdown.Item><Link to="/signout">Logout</Link></Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      )
    } else {
      return (
        <div className="top-bar-right">
          <Link to="/signin">Sign in</Link>
        </div>
      )
    }
  }
}

AuthButton.contextTypes = {
  router: PropTypes.object.isRequired,
}

export default AuthButton
