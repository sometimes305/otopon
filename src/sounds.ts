export type SoundColor = 'coral' | 'mint' | 'amber' | 'blue' | 'violet' | 'pink'

export type SoundIcon =
  | 'clap'
  | 'check'
  | 'x'
  | 'bell'
  | 'burst'
  | 'sparkles'
  | 'laugh'
  | 'crowd'
  | 'levelup'
  | 'custom'

export interface SoundDefinition {
  id: string
  label: string
  color: SoundColor
  category: 'リアクション' | 'ゲーム' | 'マイ音源'
  url: string
  icon: SoundIcon
  localOnly?: boolean
}

export const SOUND_CATEGORIES = ['定番', 'リアクション', 'ゲーム', 'マイ音源'] as const

export const SOUND_LIBRARY: SoundDefinition[] = [
  { id: 'applause', label: '拍手', color: 'coral', category: 'リアクション', url: './sounds/applause.wav', icon: 'clap' },
  { id: 'correct', label: '正解', color: 'mint', category: 'リアクション', url: './sounds/confirmation_001.wav', icon: 'check' },
  { id: 'wrong', label: '不正解', color: 'blue', category: 'リアクション', url: './sounds/error_004.wav', icon: 'x' },
  { id: 'chime', label: 'チーン', color: 'violet', category: 'リアクション', url: './sounds/bong_001.wav', icon: 'bell' },
  { id: 'boom', label: 'ドーン', color: 'amber', category: 'ゲーム', url: './sounds/drop_004.wav', icon: 'burst' },
  { id: 'sparkle', label: 'キラキラ', color: 'pink', category: 'ゲーム', url: './sounds/glass_004.wav', icon: 'sparkles' },
  { id: 'laugh', label: '笑い', color: 'mint', category: 'リアクション', url: './sounds/laugh.wav', icon: 'laugh' },
  { id: 'cheers', label: '歓声', color: 'blue', category: 'リアクション', url: './sounds/cheers.wav', icon: 'crowd' },
  { id: 'ping', label: 'ピンポン', color: 'coral', category: 'ゲーム', url: './sounds/select_002.wav', icon: 'bell' },
  { id: 'levelup', label: 'レベルアップ', color: 'violet', category: 'ゲーム', url: './sounds/fanfare.wav', icon: 'levelup' },
  { id: 'confirm', label: '決定', color: 'amber', category: 'ゲーム', url: './sounds/confirmation_003.wav', icon: 'check' },
  { id: 'cancel', label: 'キャンセル', color: 'mint', category: 'ゲーム', url: './sounds/back_003.wav', icon: 'x' },
]
