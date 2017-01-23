import React, { PropTypes } from 'react'
import { Button, Dropdown } from 'semantic-ui-react'
import { Link } from 'react-router'

class AuthButton extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
    }
  }

  render() {

    let session = { isLoggedIn: false }
    if(this.context.session) {
      session = this.context.session._session
    }

    if(session.isLoggedIn) {
      return (
        <Dropdown text={session.user.email}>
          <Dropdown.Menu>
            <Dropdown.Item><Link to="/logout">Logout</Link></Dropdown.Item>
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
  session: PropTypes.object
}

export default AuthButton
