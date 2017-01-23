import React, { PropTypes } from 'react'
import SignInForm from '../components/SignInForm'

class SignInPage extends React.Component {

  constructor(props, context) {
    super(props, context)

    // set the initial component state
    this.state = {
      validationResult: {},
      errors: [],
      user: { email: '' }
    }
    this.onSubmit = this.onSubmit.bind(this)
  }

  /**
   * Process the form.
   *
   * @param {object} event - the JavaScript event object
   */
  onSubmit(user) {
    const xhr = new XMLHttpRequest()
    xhr.open('post', '/auth/signin')
    xhr.setRequestHeader('Content-type', 'application/json;charset=UTF-8')
    xhr.responseType = 'json'
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        // change the component-container state
        this.setState({
          user,
          errors: [],
          validationResult: {},
        })

        // set a message
        //localStorage.setItem('successMessage', xhr.response.message)

        // make a redirect
        //this.context.router.replace('/login')
      } else {
        console.log(xhr.response)

        const validationResult = xhr.response.validationResult ? xhr.response.validationResult : {}
        const errors = xhr.response.errors ? xhr.response.errors : []

        this.setState({
          user,
          errors,
          validationResult
        })
      }
    })
    xhr.send(JSON.stringify({user: user.email}))
  }

  render() {
    return (
      <SignInForm
        onSubmit={this.onSubmit}
        errors={this.state.errors}
        validationResult={this.state.validationResult}
        user={this.state.user}
      />
    )
  }
}

SignInPage.contextTypes = {
  router: PropTypes.object.isRequired
}

export default SignInPage
