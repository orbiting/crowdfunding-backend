import SignInPage from './containers/SignInPage'
import User from './User'

const routes = [
  {
    path: '/signin',
    component: SignInPage
  },
  {
    path: '/logout',
    onEnter: (nextState, replace) => {
      const xhr = new XMLHttpRequest()
      xhr.open('post', '/auth/logout')
      xhr.send()
      User.remove()
      replace('/')
    }
  }
]

export default routes
