export function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="oc-fullpage" role="status" aria-live="polite">
      <span className="oc-spinner oc-spinner--lg" aria-hidden="true" />
      <p>{label}…</p>
    </div>
  )
}

/**
 * Loader for content swapped inside the application shell, so the top bar and
 * navigation stay put instead of the whole screen blanking.
 */
export function InlineLoader({ label }: { label: string }) {
  return (
    <div className="oc-state" role="status" aria-live="polite">
      <span className="oc-spinner oc-spinner--lg" aria-hidden="true" />
      <p className="oc-state__body">{label}…</p>
    </div>
  )
}
