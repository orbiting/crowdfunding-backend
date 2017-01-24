import App from './App'
import DashboardPage from './containers/DashboardPage'
import authRoutes from './auth/routes'
import Session from './auth/session'

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
    }
  ]
}

routes.childRoutes.push(...authRoutes)

export default routes
