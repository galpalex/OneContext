interface SkeletonRowsProps {
  rows?: number
  columns: number
}

/** Placeholder table rows. Render inside a <tbody> while data is loading. */
export function SkeletonRows({ rows = 5, columns }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex}>
              <span
                className="oc-skeleton"
                style={{ width: columnIndex === 0 ? '70%' : '50%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** Generic block skeleton for cards and rails. */
export function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="oc-stack" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          className="oc-skeleton"
          style={{ width: index === 0 ? '60%' : index === lines - 1 ? '40%' : '85%' }}
        />
      ))}
    </div>
  )
}
