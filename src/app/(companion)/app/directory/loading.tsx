import { Skeleton } from '@/components/ui/skeleton'

export default function CompanionDirectoryLoading() {
  return (
    <div className="space-y-4 py-1">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-[4.5rem] w-full rounded-lg" />
        <Skeleton className="h-[4.5rem] w-full rounded-lg" />
        <Skeleton className="h-[4.5rem] w-full rounded-lg" />
      </div>
    </div>
  )
}
