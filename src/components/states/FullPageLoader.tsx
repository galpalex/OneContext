export function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="oc-fullpage" role="status" aria-live="polite">
      <span className="oc-spinner oc-spinner--lg" aria-hidden="true" />
      <p>{label}…</p>
    </div>
  )
}
