import { Skeleton } from '@/components/ui/skeleton'

export default function CompanionMoreLoading() {
  return (
    <div className="space-y-3 py-1">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}
