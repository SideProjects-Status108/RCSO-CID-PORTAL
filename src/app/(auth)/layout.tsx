export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-bg-app px-4 py-12">
      {children}
    </div>
  )
}
