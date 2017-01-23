import React from 'react'
import Dashboard from '../components/Dashboard'


class DashboardPage extends React.Component {

  /**
   * Class constructor.
   */
  constructor(props) {
    super(props)

    this.state = {
      secretData: ''
    }
  }

  /**
   * This method will be executed after initial rendering.
   */
  componentDidMount() {
    const xhr = new XMLHttpRequest()
    xhr.open('get', '/test')
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        this.setState({
          secretData: xhr.response
        })
      }
    })
    xhr.send()
  }

  /**
   * Render the component.
   */
  render() {
    return (<Dashboard secretData={this.state.secretData} />)
  }

}

export default DashboardPage
