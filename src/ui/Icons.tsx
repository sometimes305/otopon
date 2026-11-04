import type { ReactNode } from 'react'
import type { SoundIcon } from '../sounds'

type IconProps = { className?: string }

function IconFrame({ children, className = '' }: IconProps & { children: ReactNode }) {
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 32 32">{children}</svg>
}

export function LogoIcon() {
  return <IconFrame className="logo-icon"><path d="M7 19.5h4l5 4V8.5l-5 4H7v7Z" fill="currentColor"/><path d="M20 12.5c2.7 2 2.7 5 0 7M23 9c5.2 4 5.2 10 0 14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.7"/></IconFrame>
}
export function StopIcon() { return <IconFrame><rect x="9" y="9" width="14" height="14" rx="2.5" fill="currentColor"/></IconFrame> }
export function VolumeIcon() { return <IconFrame><path d="M6 19h5l6 5V8l-6 5H6v6Z" fill="currentColor"/><path d="M21 12c2.7 2.3 2.7 5.7 0 8M24.5 8.5c5 4 5 11 0 15" stroke="currentColor" strokeLinecap="round" strokeWidth="2.3"/></IconFrame> }
export function AddIcon() { return <IconFrame><path d="M16 7v18M7 16h18" stroke="currentColor" strokeLinecap="round" strokeWidth="3"/></IconFrame> }
export function GridIcon() { return <IconFrame><rect x="6.5" y="6.5" width="8" height="8" rx="2" fill="currentColor"/><rect x="17.5" y="6.5" width="8" height="8" rx="2" fill="currentColor"/><rect x="6.5" y="17.5" width="8" height="8" rx="2" fill="currentColor"/><rect x="17.5" y="17.5" width="8" height="8" rx="2" fill="currentColor"/></IconFrame> }
export function VoiceIcon() { return <IconFrame><path d="M10 15.5a6 6 0 0 0 12 0v-4a6 6 0 1 0-12 0v4Z" fill="currentColor"/><path d="M6.5 16a9.5 9.5 0 0 0 19 0M16 25.5V29M11 29h10" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2"/></IconFrame> }
export function HeartIcon() { return <IconFrame><path d="M16 26S6 20.3 6 12.8C6 8.8 11.2 6 16 11c4.8-5 10-2.2 10 1.8C26 20.3 16 26 16 26Z" fill="currentColor"/></IconFrame> }

export function SoundIconView({ name }: { name: SoundIcon }) {
  if (name === 'clap') return <IconFrame><path d="m9 16-2-5.5c-.5-1.6 1.8-2.5 2.6-.9l2 4-1.4-6c-.4-1.8 2.3-2.4 2.8-.6l1.6 5.6-.7-6c-.2-1.8 2.6-2 2.9-.2l.8 6 1-4.2c.4-1.7 2.9-1.1 2.6.6l-1.1 6.7 2-2.1c1.3-1.3 3.2.5 2.1 2l-5.7 8a6.2 6.2 0 0 1-10.8-1.3L4.3 18c-.7-1.8 1.9-2.9 2.7-1.1L9 21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></IconFrame>
  if (name === 'check') return <IconFrame><path d="m7.5 16 5.7 6L25 9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"/></IconFrame>
  if (name === 'x') return <IconFrame><path d="M9 9l14 14M23 9 9 23" stroke="currentColor" strokeLinecap="round" strokeWidth="3.5"/></IconFrame>
  if (name === 'bell') return <IconFrame><path d="M8 22h16l-2.2-3.6V14a5.8 5.8 0 0 0-11.6 0v4.4L8 22Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2.3"/><path d="M13 25h6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.3"/></IconFrame>
  if (name === 'burst') return <IconFrame><path d="m16 4 2.7 7.2L26 8l-3.2 7.3L28 18l-7.2 2.2L23 28l-7-4.5L9 28l2.2-7.8L4 18l5.2-2.7L6 8l7.3 3.2L16 4Z" fill="currentColor"/></IconFrame>
  if (name === 'sparkles') return <IconFrame><path d="m12 5 1.8 5.2L19 12l-5.2 1.8L12 19l-1.8-5.2L5 12l5.2-1.8L12 5ZM23 16l1.2 3.8L28 21l-3.8 1.2L23 26l-1.2-3.8L18 21l3.8-1.2L23 16Z" fill="currentColor"/></IconFrame>
  if (name === 'laugh') return <IconFrame><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2.5"/><path d="M10 14h3M19 14h3M10.5 18.5c2 4 9 4 11 0" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"/></IconFrame>
  if (name === 'crowd') return <IconFrame><circle cx="11" cy="11" r="4" fill="currentColor"/><circle cx="21" cy="11" r="4" fill="currentColor"/><path d="M4 25c.5-5.5 3-8 7-8s6.5 2.5 7 8H4ZM14 25c.5-5.5 3-8 7-8s6.5 2.5 7 8H14Z" fill="currentColor"/></IconFrame>
  if (name === 'levelup') return <IconFrame><path d="M16 5 7 15h6v12h6V15h6L16 5Z" fill="currentColor"/></IconFrame>
  return <VolumeIcon />
}
