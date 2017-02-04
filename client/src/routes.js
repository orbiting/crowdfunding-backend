import App from './App'
import DashboardPage from './containers/DashboardPage'
import UsersPage from './containers/UsersPage'
import { Session, routes as authRoutes } from '@project-r/auth-gui'

const routes = {
  // base component (wrapper for the whole application).
  component: App,
  childRoutes: [
    {
      path: '/',
	    onEnter: (nextState, replace) => {
        replace('/dashboard')
      }
    },

    {
      path: '/dashboard',
      component: DashboardPage,
      onEnter: Session.requireAuth
    },

    {
      path: '/users',
      component: UsersPage,
      onEnter: Session.requireAuth
    }
  ]
}

routes.childRoutes.push(...authRoutes)

export default routes
