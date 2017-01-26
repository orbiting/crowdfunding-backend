import React, { PropTypes } from 'react'
import { Header, Image } from 'semantic-ui-react'
import { AuthButton } from '@project-r/auth-gui'

class App extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.state = { }
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

App.propTypes = {
  children: PropTypes.object.isRequired
}

export default App
