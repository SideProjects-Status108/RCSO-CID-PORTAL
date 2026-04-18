import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-bg-app px-4 py-12">
      {/*
        Decorative detective-badge watermark. Sits behind the auth card at
        very low opacity so the star silhouette is felt rather than seen.
        aria-hidden because it adds nothing for screen readers.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.09]"
      >
        <Image
          src="/branding/rcso-detective-badge.png"
          alt=""
          width={1024}
          height={1024}
          priority
          className="h-[min(110vh,900px)] w-auto"
        />
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  )
}
