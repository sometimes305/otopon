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
  source: 'builtIn' | 'community'
  liked?: boolean
  url: string
  icon: SoundIcon
}

export type SoundTabId = 'all' | 'builtIn' | 'community' | 'liked'

export const SOUND_TABS: Array<{ id: SoundTabId; label: string }> = [
  { id: 'all', label: 'すべて' },
  { id: 'builtIn', label: '初期音源' },
  { id: 'community', label: '投稿音源' },
  { id: 'liked', label: 'いいね' },
]

export const SOUND_LIBRARY: SoundDefinition[] = [
  { id: 'applause', label: '拍手', color: 'coral', source: 'builtIn', url: './sounds/applause.wav', icon: 'clap' },
  { id: 'correct', label: '正解', color: 'mint', source: 'builtIn', url: './sounds/confirmation_001.wav', icon: 'check' },
  { id: 'wrong', label: '不正解', color: 'blue', source: 'builtIn', url: './sounds/error_004.wav', icon: 'x' },
  { id: 'chime', label: 'チーン', color: 'violet', source: 'builtIn', url: './sounds/bong_001.wav', icon: 'bell' },
  { id: 'boom', label: 'ドーン', color: 'amber', source: 'builtIn', url: './sounds/drop_004.wav', icon: 'burst' },
  { id: 'sparkle', label: 'キラキラ', color: 'pink', source: 'builtIn', url: './sounds/glass_004.wav', icon: 'sparkles' },
  { id: 'laugh', label: '笑い', color: 'mint', source: 'builtIn', url: './sounds/laugh.wav', icon: 'laugh' },
  { id: 'cheers', label: '歓声', color: 'blue', source: 'builtIn', url: './sounds/cheers.wav', icon: 'crowd' },
  { id: 'ping', label: 'ピンポン', color: 'coral', source: 'builtIn', url: './sounds/select_002.wav', icon: 'bell' },
  { id: 'levelup', label: 'レベルアップ', color: 'violet', source: 'builtIn', url: './sounds/fanfare.wav', icon: 'levelup' },
  { id: 'confirm', label: '決定', color: 'amber', source: 'builtIn', url: './sounds/confirmation_003.wav', icon: 'check' },
  { id: 'cancel', label: 'キャンセル', color: 'mint', source: 'builtIn', url: './sounds/back_003.wav', icon: 'x' },
]
