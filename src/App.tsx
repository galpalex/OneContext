import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { FullPageLoader } from './components/states/FullPageLoader'

/**
 * Pages are loaded on demand so one screen's code does not ship with another's.
 * The login screen no longer carries the customer workspace - timeline, event
 * dialog and metrics - and the workspace is fetched only when a customer is
 * opened. Named exports are mapped to `default` because React.lazy expects one.
 */
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const CustomersPage = lazy(() =>
  import('./pages/CustomersPage').then((module) => ({ default: module.CustomersPage })),
)
const CustomerWorkspacePage = lazy(() =>
  import('./pages/CustomerWorkspacePage').then((module) => ({
    default: module.CustomerWorkspacePage,
  })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)

export function App() {
  return (
    <Routes>
      {/* Outside the shell, so a full-page loader is the right fallback. */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<FullPageLoader label="Loading OneContext" />}>
            <LoginPage />
          </Suspense>
        }
      />

      {/* Everything below requires a Supabase session. ProtectedRoute holds the
          Suspense boundary inside the shell, so navigation stays visible. */}
      <Route element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/customers" replace />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerWorkspacePage />} />
      </Route>

      <Route
        path="*"
        element={
          <Suspense fallback={<FullPageLoader label="Loading" />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  )
}
