import { TrainingSubnav } from '@/components/training/shell/training-subnav'

export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <TrainingSubnav />
      <div>{children}</div>
    </div>
  )
}
