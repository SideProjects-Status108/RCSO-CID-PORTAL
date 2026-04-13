import { Skeleton } from '@/components/ui/skeleton'

export default function CompanionMapLoading() {
  return (
    <div className="space-y-4 py-1">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-[min(60vh,420px)] w-full rounded-lg" />
    </div>
  )
}
