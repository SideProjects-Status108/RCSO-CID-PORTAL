type PlaceholderSectionProps = {
  title: string
  description: string
}

export function PlaceholderSection({ title, description }: PlaceholderSectionProps) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
        {title}
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  )
}
