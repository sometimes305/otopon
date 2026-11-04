import type { SoundDefinition } from '../sounds'
import { HeartIcon, SoundIconView } from './Icons'

export function SoundPad({ active, playKey, sound, onLike, onPlay }: { active: boolean; playKey: number; sound: SoundDefinition; onLike?: () => void; onPlay: () => void }) {
  return (
    <div className="sound-pad-wrap">
      <button aria-label={`${sound.label}を鳴らす`} className={`sound-pad sound-pad--${sound.color}${active ? ' is-playing' : ''}`} onClick={onPlay} type="button">
        <span className="pad-icon"><SoundIconView name={sound.icon} /></span>
        <span className="pad-label">{sound.label}</span>
        {sound.author && <span className="pad-author">{sound.author}</span>}
        {active && <span className="playing-ring" key={playKey} aria-hidden="true" />}
      </button>
      {onLike && (
        <button aria-label={`${sound.label}を${sound.liked ? 'いいねから外す' : 'いいねする'}`} className={sound.liked ? 'pad-like is-liked' : 'pad-like'} onClick={onLike} type="button">
          <HeartIcon /><span>{sound.likeCount || 0}</span>
        </button>
      )}
    </div>
  )
}
