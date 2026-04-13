import { Skeleton } from '@/components/ui/skeleton'

export default function CompanionCalloutLoading() {
  return (
    <div className="space-y-4 py-1">
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  )
}
