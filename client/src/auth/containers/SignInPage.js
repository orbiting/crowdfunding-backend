import React, { PropTypes } from 'react'
import SignInForm from '../components/SignInForm'
import { Container } from 'semantic-ui-react'
import Session from '../session'

class SignInPage extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      errors: [],
      email: '',
      waitingForSignin: false,
      sessionPollCounter: 0,
      session: new Session()
    }
    this.onSubmit = this.onSubmit.bind(this)
  }

  onSubmit(email) {
    const { session } = this.state
    this.setState({email})
    session.signin(email).then( () => {
      var intervalId = setInterval(this.pollSession.bind(this), 600)
      this.setState({
        intervalId: intervalId,
        waitingForSignin: true
      })
    }).catch( (error) => {
      this.setState({
        errors: [ error.toString() ]
      })
    })
  }

  componentWillUnmount() {
    const { intervalId } = this.state
    if(intervalId)
      clearInterval(intervalId)
  }

  pollSession() {
    const { router } = this.context
    const { session, intervalId, sessionPollCounter } = this.state
    session.getSession().then( () => {
      clearInterval(intervalId)
      router.replace('/dashboard')
    }).catch( (error) => {
      //session not yet ready
      this.setState({sessionPollCounter: sessionPollCounter+1})
      //reset after enough of polling: 0.6s*400=4min
      if(sessionPollCounter>400) {
        clearInterval(intervalId)
        this.setState({waitingForSignin: false})
      }
    })
  }

  render() {
    const { waitingForSignin, email } = this.state
    return (
      <div>
      { waitingForSignin ? (
        <Container textAlign='center'>
          <p>We sent an email to {email}. Please follow the link inside and come back here.</p>
        </Container>
      ) : (
        <SignInForm
          onSubmit={this.onSubmit}
          errors={this.state.errors}
          email={this.state.email}
        />
      )}
      </div>
    )
  }
}

SignInPage.contextTypes = {
  router: PropTypes.object.isRequired,
}

export default SignInPage
