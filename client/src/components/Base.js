import React, { PropTypes } from 'react'
import { Link, IndexLink } from 'react-router'
import { Header, Image, Button } from 'semantic-ui-react'
import AuthButton from '../auth/containers/AuthButton'
import Session from '../auth/session'

class Base extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.state = {
      session: null
    }
  }

  componentDidMount() {
    let session = new Session()
    session.getSession()
    this.setState( {session} )
  }

  getChildContext() {
    return {session: this.state.session }
  }

  render() {
    const { children } = this.props
    return (
      <div>
        <div className="top-bar">
          <Header as='h2' className="top-bar-left">
            <Image size='tiny' src='https://assets.project-r.construction/images/project_r_logo.svg' />
            {' '}Users &amp; Roles
          </Header>

          <div className="top-bar-right">
            <AuthButton/>
          </div>

        </div>
        {children}
      </div>
    )
  }
}

Base.propTypes = {
  children: PropTypes.object.isRequired
}

Base.childContextTypes = {
  session: PropTypes.object
}

export default Base
