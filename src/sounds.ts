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
  likeCount?: number
  author?: string
  createdAt?: string
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
  { id: 'tada', label: 'テッテレー', color: 'coral', source: 'builtIn', url: './sounds/tada.wav', icon: 'levelup' },
  { id: 'big-win', label: '大成功', color: 'amber', source: 'builtIn', url: './sounds/big-win.wav', icon: 'sparkles' },
  { id: 'victory-8bit', label: '勝利', color: 'mint', source: 'builtIn', url: './sounds/victory-8bit.wav', icon: 'levelup' },
  { id: 'level-up', label: 'レベルアップ', color: 'violet', source: 'builtIn', url: './sounds/level-up.wav', icon: 'levelup' },
  { id: 'item-get', label: 'アイテムゲット', color: 'pink', source: 'builtIn', url: './sounds/item-get.wav', icon: 'sparkles' },
  { id: 'game-over', label: 'ゲームオーバー', color: 'blue', source: 'builtIn', url: './sounds/game-over.wav', icon: 'x' },
  { id: 'too-bad', label: '残念', color: 'mint', source: 'builtIn', url: './sounds/too-bad.wav', icon: 'x' },
  { id: 'danger', label: 'ピンチ', color: 'coral', source: 'builtIn', url: './sounds/danger.wav', icon: 'burst' },
  { id: 'reveal', label: 'ジャジャーン', color: 'amber', source: 'builtIn', url: './sounds/reveal.wav', icon: 'burst' },
  { id: 'decision', label: '決定', color: 'blue', source: 'builtIn', url: './sounds/decision.wav', icon: 'check' },
  { id: 'entrance', label: '登場', color: 'violet', source: 'builtIn', url: './sounds/entrance.wav', icon: 'burst' },
  { id: 'punchline', label: 'オチ', color: 'pink', source: 'builtIn', url: './sounds/punchline.wav', icon: 'laugh' },
  { id: 'sparkle', label: 'キラリン', color: 'mint', source: 'builtIn', url: './sounds/sparkle.wav', icon: 'sparkles' },
  { id: 'success-8bit', label: '8bit成功', color: 'blue', source: 'builtIn', url: './sounds/success-8bit.wav', icon: 'check' },
  { id: 'fail-8bit', label: '8bit失敗', color: 'coral', source: 'builtIn', url: './sounds/fail-8bit.wav', icon: 'x' },
  { id: 'select-8bit', label: '8bit決定', color: 'amber', source: 'builtIn', url: './sounds/select-8bit.wav', icon: 'check' },
  { id: 'impact-don', label: 'ドン！', color: 'violet', source: 'builtIn', url: './sounds/impact-don.wav', icon: 'burst' },
  { id: 'impact-pon', label: 'ポン！', color: 'pink', source: 'builtIn', url: './sounds/impact-pon.wav', icon: 'burst' },
  { id: 'zukeen', label: 'ズキューン', color: 'mint', source: 'builtIn', url: './sounds/zukeen.wav', icon: 'sparkles' },
  { id: 'chime-hit', label: 'チーン', color: 'blue', source: 'builtIn', url: './sounds/chime-hit.wav', icon: 'bell' },
  { id: 'coins', label: 'コイン', color: 'amber', source: 'builtIn', url: './sounds/coins.wav', icon: 'sparkles' },
  { id: 'dice', label: 'サイコロ', color: 'coral', source: 'builtIn', url: './sounds/dice.wav', icon: 'custom' },
  { id: 'card-shuffle', label: 'カードシャッフル', color: 'violet', source: 'builtIn', url: './sounds/card-shuffle.wav', icon: 'custom' },
  { id: 'metal-crash', label: '金属ガチャン', color: 'pink', source: 'builtIn', url: './sounds/metal-crash.wav', icon: 'burst' },
]
