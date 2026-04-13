import { Skeleton } from '@/components/ui/skeleton'

export default function CompanionFormsLoading() {
  return (
    <div className="space-y-4 py-1">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </div>
  )
}
