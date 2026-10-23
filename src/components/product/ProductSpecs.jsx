// A label / value specification list. Renders nothing without specs, so a
// product only shows confirmed specifications that are passed in.
export default function ProductSpecs({ specs, title = 'Specifications' }) {
  if (!specs?.length) return null
  return (
    <>
      <h3 className="pd-specs-title">{title}</h3>
      <dl className="pd-specs">
        {/* Labels may repeat (e.g. two "Movement" rows), so the key includes the row position. */}
        {specs.map((spec, i) => (
          <div className="pd-spec" key={`${spec.label}-${i}`}>
            <dt>{spec.label}</dt>
            <dd>{spec.value}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
