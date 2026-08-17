/**
 * OneContext mark - original artwork.
 * Three inbound channel strokes converging into one solid point: many
 * interactions, one context. No third-party logo or asset is used.
 */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      role="img"
      aria-label="OneContext"
      focusable="false"
    >
      <rect width="28" height="28" rx="8" fill="var(--oc-primary-600)" />
      <g stroke="var(--oc-neutral-000)" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M6 8.5h5" />
        <path d="M6 14h7.5" />
        <path d="M6 19.5h5" />
      </g>
      <circle cx="19.5" cy="14" r="3.6" fill="var(--oc-neutral-000)" />
    </svg>
  )
}
