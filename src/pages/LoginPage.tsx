import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabaseConfigError } from '../lib/supabase'
import { BrandMark } from '../components/shell/BrandMark'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'
import { FullPageLoader } from '../components/states/FullPageLoader'

interface ValuePoint {
  icon: IconName
  title: string
  body: string
}

const VALUE_POINTS: ValuePoint[] = [
  {
    icon: 'inbox',
    title: 'One customer history',
    body: 'Web forms, WhatsApp, email and phone notes land in a single chronological timeline.',
  },
  {
    icon: 'chart',
    title: 'Metrics you can trust',
    body: 'Every number is calculated from stored interactions - never estimated or invented.',
  },
  {
    icon: 'sparkle',
    title: 'A recommended next step',
    body: 'OneContext AI reads the stored history and proposes one action. You confirm before anything is saved.',
  },
  {
    icon: 'lock',
    title: 'Your data stays yours',
    body: 'Row Level Security scopes every record to the signed-in account.',
  },
]

export function LoginPage() {
  const { status, signInWithGoogle, signInPending, authError } = useAuth()
  const location = useLocation()

  const from = (location.state as { from?: string } | null)?.from
  const target = from && from !== '/login' ? from : '/customers'

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session" />
  }

  if (status === 'signed-in') {
    return <Navigate to={target} replace />
  }

  return (
    <div className="oc-login">
      <section className="oc-login__panel">
        <div className="oc-row">
          <BrandMark size={34} />
          <span style={{ fontWeight: 700, fontSize: 'var(--oc-text-lg)' }}>OneContext</span>
        </div>

        <div className="oc-stack">
          <h1 className="oc-login__title">Every customer interaction, one clear next step.</h1>
          <p className="oc-login__lede">
            An AI-powered omnichannel CRM workspace for small customer-facing teams. Sign in to open
            your customers, review their full interaction history and decide what to do next.
          </p>
        </div>

        {supabaseConfigError ? (
          <div className="oc-banner oc-banner--attention" role="status">
            <Icon name="alert" size={18} />
            <div>
              <p className="oc-banner__title">Local configuration missing</p>
              <p>{supabaseConfigError}</p>
            </div>
          </div>
        ) : null}

        {authError ? (
          <div className="oc-banner oc-banner--critical" role="alert">
            <Icon name="alert" size={18} />
            <div>
              <p className="oc-banner__title">Sign-in failed</p>
              <p>{authError}</p>
            </div>
          </div>
        ) : null}

        <div className="oc-stack">
          <Button
            variant="primary"
            size="lg"
            loading={signInPending}
            disabled={Boolean(supabaseConfigError)}
            onClick={() => void signInWithGoogle()}
          >
            {signInPending ? 'Redirecting to Google…' : 'Continue with Google'}
          </Button>
          <p className="oc-login__footnote">
            OneContext uses Google sign-in through Supabase Auth. We never see your Google password.
          </p>
        </div>
      </section>

      <aside className="oc-login__aside" aria-label="What OneContext does">
        <p className="oc-label">Why OneContext</p>
        <ul className="oc-login__points">
          {VALUE_POINTS.map((point) => (
            <li className="oc-login__point" key={point.title}>
              <span className="oc-login__point-icon">
                <Icon name={point.icon} size={16} />
              </span>
              <div>
                <p className="oc-login__point-title">{point.title}</p>
                <p className="oc-login__point-body">{point.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
