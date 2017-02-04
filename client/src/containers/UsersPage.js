import React from 'react'
import { graphql } from 'react-apollo'
import gql from 'graphql-tag'
import ReactTable from 'react-table'

import 'react-table/react-table.css'

class UsersPage extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
    }
  }

  componentDidMount() {
  }

  render() {
    const { loading, users } = this.props.data
    if(loading) {
      return (<p>Loading...</p>)
    }

    const columns = [{
      header: 'ID',
      accessor: 'id' // String-based value accessors !
    }, {
      header: 'email',
      accessor: 'email',
    }, {
      header: 'createdAt',
      accessor: 'createdAt',
    }]

    return <ReactTable
      data={users}
      columns={columns}
    />
  }

}

const query = gql`
{users {
  id
  email
  createdAt
  roles {
    id
    name
  }
}}`

export default graphql(query)(UsersPage)
