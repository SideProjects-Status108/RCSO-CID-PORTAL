'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function colorFromName(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 13) % 360
  return `hsl(${h} 35% 32%)`
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
}

type AppAvatarProps = {
  name: string
  photoUrl?: string | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'size-8 text-xs [&_[data-slot=avatar-fallback]]:text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
}

export function AppAvatar({
  name,
  photoUrl,
  className,
  size = 'md',
}: AppAvatarProps) {
  const bg = colorFromName(name)
  const init = initials(name)

  return (
    <Avatar className={cn('border border-border-subtle', sizes[size], className)}>
      {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
      <AvatarFallback
        className="font-medium text-text-primary"
        style={{ backgroundColor: bg }}
      >
        {init}
      </AvatarFallback>
    </Avatar>
  )
}
