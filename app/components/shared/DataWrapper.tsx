import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

interface DataWrapperProps<T> {
  data: T[] | null | undefined
  loading: boolean
  error?: string | null
  empty?: React.ReactNode
  skeleton?: React.ReactNode
  children: (data: T[]) => React.ReactNode
}

export function DataWrapper<T>({
  data,
  loading,
  error,
  empty,
  skeleton,
  children,
}: DataWrapperProps<T>) {
  if (loading) {
    return (
      <>
        {skeleton || (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}
      </>
    )
  }

  if (error) {
    return <ErrorState description={error} />
  }

  if (!data || data.length === 0) {
    return (
      <>
        {empty || <EmptyState title="No data yet" />}
      </>
    )
  }

  return <>{children(data)}</>
}
