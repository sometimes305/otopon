import type { SoundDefinition } from '../sounds'
import { SoundIconView } from './Icons'

export function SoundPad({ active, playKey, sound, onPlay }: { active: boolean; playKey: number; sound: SoundDefinition; onPlay: () => void }) {
  return (
    <button aria-label={`${sound.label}を鳴らす`} className={`sound-pad sound-pad--${sound.color}${active ? ' is-playing' : ''}`} onClick={onPlay} type="button">
      <span className="pad-icon"><SoundIconView name={sound.icon} /></span>
      <span className="pad-label">{sound.label}</span>
      {active && <span className="playing-ring" key={playKey} aria-hidden="true" />}
    </button>
  )
}
