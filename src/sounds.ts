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
  { id: 'victory-8bit', label: '勝利！', color: 'mint', source: 'builtIn', url: './sounds/victory-8bit.wav', icon: 'levelup' },
  { id: 'level-up', label: 'おめでとう', color: 'violet', source: 'builtIn', url: './sounds/level-up.wav', icon: 'levelup' },
  { id: 'item-get', label: 'ジャジャーン', color: 'pink', source: 'builtIn', url: './sounds/item-get.wav', icon: 'sparkles' },
  { id: 'game-over', label: '終了！', color: 'blue', source: 'builtIn', url: './sounds/game-over.wav', icon: 'x' },
  { id: 'too-bad', label: 'ピンチ！', color: 'mint', source: 'builtIn', url: './sounds/too-bad.wav', icon: 'x' },
  { id: 'danger', label: '警告！', color: 'coral', source: 'builtIn', url: './sounds/danger.wav', icon: 'bell' },
  { id: 'reveal', label: '発表！', color: 'amber', source: 'builtIn', url: './sounds/reveal.wav', icon: 'burst' },
  { id: 'decision', label: 'ピッ！', color: 'blue', source: 'builtIn', url: './sounds/decision.wav', icon: 'check' },
  { id: 'entrance', label: '登場！', color: 'violet', source: 'builtIn', url: './sounds/entrance.wav', icon: 'burst' },
  { id: 'punchline', label: 'デデーン', color: 'pink', source: 'builtIn', url: './sounds/punchline.wav', icon: 'laugh' },
  { id: 'sparkle', label: 'キラキラ', color: 'mint', source: 'builtIn', url: './sounds/sparkle.wav', icon: 'sparkles' },
  { id: 'success-8bit', label: '祝福！', color: 'blue', source: 'builtIn', url: './sounds/success-8bit.wav', icon: 'sparkles' },
  { id: 'fail-8bit', label: 'ショック！', color: 'coral', source: 'builtIn', url: './sounds/fail-8bit.wav', icon: 'x' },
  { id: 'select-8bit', label: 'ピコーン', color: 'amber', source: 'builtIn', url: './sounds/select-8bit.wav', icon: 'check' },
  { id: 'impact-don', label: 'ドン！', color: 'violet', source: 'builtIn', url: './sounds/impact-don.wav', icon: 'burst' },
  { id: 'impact-pon', label: 'ドン（短）', color: 'pink', source: 'builtIn', url: './sounds/impact-pon.wav', icon: 'burst' },
  { id: 'zukeen', label: '衝撃！', color: 'mint', source: 'builtIn', url: './sounds/zukeen.wav', icon: 'burst' },
  { id: 'chime-hit', label: 'インパクト', color: 'blue', source: 'builtIn', url: './sounds/chime-hit.wav', icon: 'bell' },
  { id: 'coins', label: 'チャリーン', color: 'amber', source: 'builtIn', url: './sounds/coins.wav', icon: 'sparkles' },
  { id: 'dice', label: 'レジ', color: 'coral', source: 'builtIn', url: './sounds/dice.wav', icon: 'custom' },
  { id: 'card-shuffle', label: 'キメ！', color: 'violet', source: 'builtIn', url: './sounds/card-shuffle.wav', icon: 'burst' },
  { id: 'metal-crash', label: '注目！', color: 'pink', source: 'builtIn', url: './sounds/metal-crash.wav', icon: 'burst' },
]
