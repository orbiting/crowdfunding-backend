import Base from './components/Base'
import DashboardPage from './containers/DashboardPage'
import authRoutes from './auth/routes'
import User from './auth/User'


const routes = {
  // base component (wrapper for the whole application).
  component: Base,
  childRoutes: [
    {
      path: '/',
      indexRoute: { component: DashboardPage },
      onEnter: ({ params }, replace) => {
        if(User.get())
          replace('/dashboard')
        else
          replace('/signin')
      }
    },

    {
      path: '/dashboard',
      component: DashboardPage
    }
  ]
}

routes.childRoutes.push(...authRoutes)

export default routes
