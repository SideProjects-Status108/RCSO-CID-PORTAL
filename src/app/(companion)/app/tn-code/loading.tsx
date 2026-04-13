import { Skeleton } from '@/components/ui/skeleton'

export default function CompanionTnCodeLoading() {
  return (
    <div className="space-y-4 py-1">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  )
}
