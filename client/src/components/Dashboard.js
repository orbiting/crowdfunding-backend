import React, { PropTypes } from 'react'
import { Container, Header } from 'semantic-ui-react'

const Dashboard = ({ secretData }) => (
  <Container>
    <Header as='h1'>Dashboard</Header>
    {secretData && <p style={{ fontSize: '16px', color: 'green' }}>{secretData}</p>}
  </Container>
)

Dashboard.propTypes = {
  secretData: PropTypes.string.isRequired
}

export default Dashboard
