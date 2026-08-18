import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { AppShell } from '../components/shell/AppShell'
import { FullPageLoader, InlineLoader } from '../components/states/FullPageLoader'

/**
 * Gate for every authenticated route. While the session is being restored we
 * must not redirect, otherwise a page refresh would bounce a signed-in user to
 * the login screen.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <FullPageLoader label="Restoring your OneContext session" />
  }

  if (status === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <AppShell>
      {/* Inside the shell: a lazily loaded page must not blank the top bar. */}
      <Suspense fallback={<InlineLoader label="Loading" />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}
