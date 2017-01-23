import React, { PropTypes } from 'react'
import { Link } from 'react-router'
import { Card, Input, Message, Button, Image } from 'semantic-ui-react'
import t from '../lib/tcomb-form'

const Form = t.form.Form
const Signin = t.struct({
  email: t.String
})


//https://github.com/gcanti/tcomb-form/issues/234
function getOptionsFromValidationResult(_options, result) {
  let options = _options || {
    fields: {}
  }
  if(!result || !result.errors) {
    return options
  }
  result.errors.forEach( (error) => {
    options.fields[error.path[0]] = {
      hasError: true,
      error: error.message
    }
  })
  console.log(options)
  return options
}

/*
const SignInForm = ({
  onSubmit,
  onChange,
  errors,
  user,
}) => (
*/
class SignInForm extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.onSubmit = this.onSubmit.bind(this)
  }
  onSubmit() {
    // validate a field on every change
    const validationResult = this.refs.form.validate()
    if(validationResult.isValid()) {
      const user = this.refs.form.getValue()
      this.props.onSubmit(user)
    }
  }
  render() {
    const { user, errors, validationResult } = this.props
    const options = {}//getOptionsFromValidationResult(SigninOptions, validationResult)
    return (
      <Card className="container">
      <Image src='https://assets.project-r.construction/images/balkon.jpg' size='medium' />
      <Form
      ref="form"
      type={Signin}
      options={options}
      value={user}
      />

      {errors.length>0 &&
        <Message error>
        <Message.Header>Damn!</Message.Header>
        <Message.List>
        {errors.map(function(error){
          return <Message.Item>{error}</Message.Item>
        })}
      </Message.List>
      </Message>
    }

      <Button primary onClick={this.onSubmit}>Signin</Button>
      </Card>
    )
  }
}

SignInForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  errors: PropTypes.array.isRequired,
  validationResult: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired
}

export default SignInForm
