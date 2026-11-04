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
  { id: 'all', label: 'すべての音' },
  { id: 'builtIn', label: 'おすすめの音' },
  { id: 'community', label: 'みんなの音' },
  { id: 'liked', label: 'いいねした音' },
]

export const SOUND_LIBRARY: SoundDefinition[] = [
  { id: 'tada', label: 'テッテレー', color: 'coral', source: 'builtIn', url: './sounds/tada.wav?v=diverse-20261104', icon: 'levelup' },
  { id: 'big-win', label: '大成功', color: 'amber', source: 'builtIn', url: './sounds/big-win.wav?v=diverse-20261104', icon: 'sparkles' },
  { id: 'victory-8bit', label: '拍手', color: 'mint', source: 'builtIn', url: './sounds/victory-8bit.wav?v=diverse-20261104', icon: 'clap' },
  { id: 'level-up', label: '歓声', color: 'violet', source: 'builtIn', url: './sounds/level-up.wav?v=diverse-20261104', icon: 'crowd' },
  { id: 'item-get', label: 'イェーイ！', color: 'pink', source: 'builtIn', url: './sounds/item-get.wav?v=diverse-20261104', icon: 'crowd' },
  { id: 'game-over', label: '不正解', color: 'blue', source: 'builtIn', url: './sounds/game-over.wav?v=diverse-20261104', icon: 'x' },
  { id: 'too-bad', label: '正解', color: 'mint', source: 'builtIn', url: './sounds/too-bad.wav?v=diverse-20261104', icon: 'check' },
  { id: 'danger', label: '警告！', color: 'coral', source: 'builtIn', url: './sounds/danger.wav?v=diverse-20261104', icon: 'bell' },
  { id: 'reveal', label: 'ジャジャーン', color: 'amber', source: 'builtIn', url: './sounds/reveal.wav?v=diverse-20261104', icon: 'burst' },
  { id: 'decision', label: 'ピッ！', color: 'blue', source: 'builtIn', url: './sounds/decision.wav?v=diverse-20261104', icon: 'check' },
  { id: 'entrance', label: '登場！', color: 'violet', source: 'builtIn', url: './sounds/entrance.wav?v=diverse-20261104', icon: 'burst' },
  { id: 'punchline', label: 'キラーン', color: 'pink', source: 'builtIn', url: './sounds/punchline.wav?v=diverse-20261104', icon: 'sparkles' },
  { id: 'sparkle', label: 'キラキラ', color: 'mint', source: 'builtIn', url: './sounds/sparkle.wav?v=diverse-20261104', icon: 'sparkles' },
  { id: 'success-8bit', label: '出題！', color: 'blue', source: 'builtIn', url: './sounds/success-8bit.wav?v=diverse-20261104', icon: 'custom' },
  { id: 'fail-8bit', label: 'ピー', color: 'coral', source: 'builtIn', url: './sounds/fail-8bit.wav?v=diverse-20261104', icon: 'x' },
  { id: 'select-8bit', label: '早押し', color: 'amber', source: 'builtIn', url: './sounds/select-8bit.wav?v=diverse-20261104', icon: 'bell' },
  { id: 'impact-don', label: 'ドン！', color: 'violet', source: 'builtIn', url: './sounds/impact-don.wav?v=diverse-20261104', icon: 'burst' },
  { id: 'impact-pon', label: 'バシッ！', color: 'pink', source: 'builtIn', url: './sounds/impact-pon.wav?v=diverse-20261104', icon: 'burst' },
  { id: 'zukeen', label: 'バタン！', color: 'mint', source: 'builtIn', url: './sounds/zukeen.wav?v=diverse-20261104', icon: 'burst' },
  { id: 'chime-hit', label: 'ヒュン！', color: 'blue', source: 'builtIn', url: './sounds/chime-hit.wav?v=diverse-20261104', icon: 'burst' },
  { id: 'coins', label: 'チャリーン', color: 'amber', source: 'builtIn', url: './sounds/coins.wav?v=diverse-20261104', icon: 'sparkles' },
  { id: 'dice', label: '銃声', color: 'coral', source: 'builtIn', url: './sounds/dice.wav?v=diverse-20261104', icon: 'burst' },
  { id: 'card-shuffle', label: 'ヒョイ！', color: 'violet', source: 'builtIn', url: './sounds/card-shuffle.wav?v=diverse-20261104', icon: 'custom' },
  { id: 'metal-crash', label: '注目！', color: 'pink', source: 'builtIn', url: './sounds/metal-crash.wav?v=diverse-20261104', icon: 'bell' },
]
