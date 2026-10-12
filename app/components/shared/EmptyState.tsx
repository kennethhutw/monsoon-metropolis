import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-body-lg font-semibold text-ink mb-2">{title}</h3>
      {description && (
        <p className="text-body-md text-ink-muted mb-6 max-w-sm">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="default" size="sm">{action.label}</Button>
          </Link>
        ) : (
          <Button variant="default" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
