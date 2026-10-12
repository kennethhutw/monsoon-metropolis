import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again later, or contact your system administrator.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-full max-w-sm bg-error-container/40 border border-error/30 rounded-lg p-4">
        <p className="text-body-md font-semibold text-error mb-1">{title}</p>
        <p className="text-label-md text-on-surface-variant mb-4">{description}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
