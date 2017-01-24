import React, { PropTypes } from 'react'
import { Card, Message, Button, Image } from 'semantic-ui-react'
import t from '../lib/tcomb-form'

const Form = t.form.Form
const Signin = t.struct({
  email: t.String
})


class SignInForm extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.onSubmit = this.onSubmit.bind(this)
  }
  onSubmit() {
    const values = this.refs.form.getValue()
    this.props.onSubmit(values.email)
  }
  render() {
    const { email, errors } = this.props
    const options = {}
    return (
      <Card className="container">
      <Image src='https://assets.project-r.construction/images/balkon.jpg' size='medium' />
      <Form
      ref="form"
      type={Signin}
      options={options}
      value={email}
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
  email: PropTypes.string.isRequired,
}

export default SignInForm
