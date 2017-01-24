import SignInPage from './containers/SignInPage'
import Session from './session'

const routes = [
  {
    path: '/signin',
    component: SignInPage,
    onEnter: Session.redirectIfAuth
  },
  {
    path: '/signout',
    onEnter: (nextState, replace) => {
      const session = new Session()
      //TODO replace with requireAuth
      if(!session._session.isLoggedIn) {
        replace('/signin')
      }
      session.signout()
      replace('/')
    }
  }
]

export default routes
