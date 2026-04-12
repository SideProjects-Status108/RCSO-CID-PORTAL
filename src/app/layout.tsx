import type { Metadata } from 'next'
import { Orbitron, Poppins, JetBrains_Mono } from 'next/font/google'

import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CID PORTAL',
  description:
    'Criminal Investigation Division internal operations portal for case management, forms, scheduling, and training.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${poppins.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg-app text-text-primary">
        {children}
      </body>
    </html>
  )
}
