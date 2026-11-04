import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './App.css'
import { AudioEngine } from './lib/audio-engine'
import { loadCustomSounds, saveCustomSound, type StoredSound } from './lib/sound-store'
import { SOUND_CATEGORIES, SOUND_LIBRARY, type SoundColor, type SoundDefinition } from './sounds'
import { AddIcon, GridIcon, LogoIcon, StopIcon, VoiceIcon, VolumeIcon } from './ui/Icons'
import { SoundPad } from './ui/SoundPad'

type ActiveView = 'box' | 'add' | 'voice'

type CustomSoundView = StoredSound & { url: string }

const COLORS: SoundColor[] = ['coral', 'mint', 'amber', 'blue', 'violet', 'pink']

function App() {
  const audio = useRef(new AudioEngine())
  const mounted = useRef(false)
  const customUrls = useRef(new Set<string>())
  const [activeView, setActiveView] = useState<ActiveView>('box')
  const [category, setCategory] = useState('定番')
  const [volume, setVolume] = useState(0.82)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playKey, setPlayKey] = useState(0)
  const [notice, setNotice] = useState('')
  const [customSounds, setCustomSounds] = useState<CustomSoundView[]>([])

  useEffect(() => {
    mounted.current = true
    const audioEngine = audio.current
    const urlSet = customUrls.current
    void loadCustomSounds().then((sounds) => {
      if (!mounted.current) return
      const views = sounds.map((sound) => {
        const url = URL.createObjectURL(sound.blob)
        urlSet.add(url)
        return { ...sound, url }
      })
      setCustomSounds(views)
    })

    return () => {
      mounted.current = false
      urlSet.forEach((url) => URL.revokeObjectURL(url))
      urlSet.clear()
      audioEngine.destroy()
    }
  }, [])

  useEffect(() => {
    audio.current.setVolume(volume)
  }, [volume])

  const allSounds = useMemo<SoundDefinition[]>(
    () => [
      ...SOUND_LIBRARY,
      ...customSounds.map<SoundDefinition>((sound) => ({
        id: sound.id,
        label: sound.label,
        color: sound.color,
        category: 'マイ音源',
        url: sound.url,
        icon: 'custom' as const,
        localOnly: true,
      })),
    ],
    [customSounds],
  )

  const playSound = useCallback(async (sound: SoundDefinition) => {
    setNotice('')
    setPlayingId(sound.id)
    setPlayKey((value) => value + 1)
    try {
      await audio.current.play(sound.id, sound.url, () => {
        setPlayingId((current) => current === sound.id ? null : current)
      })
    } catch {
      setPlayingId(null)
      setNotice('音を読み込めませんでした')
    }
  }, [])

  const visibleSounds = allSounds.filter((sound) =>
    category === '定番' ? !sound.localOnly : sound.category === category,
  )

  const stopAll = () => {
    audio.current.stopAll()
    setPlayingId(null)
  }

  const addCustomSound = async (input: { label: string; color: SoundColor; file: File }) => {
    const stored = await saveCustomSound(input)
    const sound = { ...stored, url: URL.createObjectURL(stored.blob) }
    customUrls.current.add(sound.url)
    setCustomSounds((current) => [...current, sound])
    setCategory('マイ音源')
    setActiveView('box')
    setNotice('この端末のマイ音源へ追加しました')
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><LogoIcon /><h1>音ポン</h1></div>
        <div className="sync-state sync-state--connected">
          <span aria-hidden="true" />
          マイクONでルームへ
        </div>
      </header>

      <section className="category-tabs" aria-label="効果音カテゴリー">
        {SOUND_CATEGORIES.map((item) => (
          <button
            aria-pressed={category === item}
            className={category === item ? 'category-tab is-active' : 'category-tab'}
            key={item}
            onClick={() => { setCategory(item); setActiveView('box') }}
            type="button"
          >
            {item}
          </button>
        ))}
      </section>

      <section className="mixer-strip">
        <button className="stop-button" onClick={stopAll} type="button">
          <StopIcon /> 全停止
        </button>
        <label className="volume-control">
          <VolumeIcon />
          <span>音量</span>
          <input aria-label="効果音の音量" max="1" min="0" onChange={(event) => setVolume(Number(event.target.value))} step="0.01" type="range" value={volume} />
        </label>
      </section>

      <section className="sound-grid" aria-live="polite">
        {visibleSounds.map((sound) => (
          <SoundPad active={playingId === sound.id} key={sound.id} playKey={playingId === sound.id ? playKey : 0} sound={sound} onPlay={() => void playSound(sound)} />
        ))}
        {visibleSounds.length === 0 && (
          <button className="empty-library" onClick={() => setActiveView('add')} type="button">
            <AddIcon /><strong>まだ音源がありません</strong><span>最初の効果音を追加</span>
          </button>
        )}
      </section>

      {notice && <p className="notice" role="status">{notice}</p>}

      <nav className="bottom-nav" aria-label="メインメニュー">
        <NavButton active={activeView === 'box'} icon={<GridIcon />} label="ボックス" onClick={() => setActiveView('box')} />
        <NavButton active={activeView === 'add'} icon={<AddIcon />} label="音を追加" onClick={() => setActiveView('add')} />
        <NavButton active={activeView === 'voice'} icon={<VoiceIcon />} label="ずんだもん" onClick={() => setActiveView('voice')} />
      </nav>

      {activeView === 'add' && <AddSoundSheet onAdd={addCustomSound} onClose={() => setActiveView('box')} onVoice={() => setActiveView('voice')} />}
      {activeView === 'voice' && <VoiceSheet onClose={() => setActiveView('box')} />}
    </main>
  )
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'nav-button is-active' : 'nav-button'} onClick={onClick} type="button">{icon}<span>{label}</span></button>
}

function AddSoundSheet({ onAdd, onClose, onVoice }: { onAdd: (input: { label: string; color: SoundColor; file: File }) => Promise<void>; onClose: () => void; onVoice: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('自分の効果音')
  const [color, setColor] = useState<SoundColor>('coral')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!file) return setError('効果音ファイルを選んでください')
    if (!file.type.startsWith('audio/')) return setError('音声ファイルを選んでください')
    if (file.size > 5 * 1024 * 1024) return setError('5MB以下の音声を選んでください')
    if (!label.trim()) return setError('ボタン名を入力してください')
    setSaving(true)
    try {
      await onAdd({ label: label.trim().slice(0, 12), color, file })
    } catch {
      setError('保存できませんでした')
      setSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="add-title" aria-modal="true" className="bottom-sheet" role="dialog">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header"><h2 id="add-title">音を追加</h2><button onClick={onClose} type="button">閉じる</button></div>
        <input accept="audio/*,.mp3,.wav,.ogg,.m4a" className="visually-hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} ref={inputRef} type="file" />
        <button className={file ? 'file-picker has-file' : 'file-picker'} onClick={() => inputRef.current?.click()} type="button">
          <VolumeIcon /><strong>{file ? file.name : '効果音ファイルを選ぶ'}</strong><span>MP3・WAV・OGG・M4A／5MBまで</span>
        </button>
        <label className="field-label">ボタン名<input maxLength={12} onChange={(event) => setLabel(event.target.value)} value={label} /></label>
        <fieldset className="color-field"><legend>ボタンの色</legend><div>{COLORS.map((item) => <button aria-label={`${item}色`} aria-pressed={color === item} className={`color-swatch color-swatch--${item}`} key={item} onClick={() => setColor(item)} type="button" />)}</div></fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-action" disabled={saving} onClick={() => void submit()} type="button">{saving ? '追加中…' : 'この端末に追加'}</button>
        <div className="future-row"><VoiceIcon /><div><strong>ずんだもんにしゃべらせる</strong><span>文章から効果音をつくる機能</span></div><button onClick={onVoice} type="button">準備中</button></div>
      </section>
    </div>
  )
}

function VoiceSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="voice-title" aria-modal="true" className="bottom-sheet voice-sheet" role="dialog">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header"><h2 id="voice-title">ずんだもん</h2><button onClick={onClose} type="button">閉じる</button></div>
        <div className="voice-mark"><VoiceIcon /></div>
        <h3>好きな言葉を効果音に</h3>
        <p>VOICEVOX連携と共有保存は次の段階で追加します。初版では誤って別の声を使わないよう、生成ボタンを停止しています。</p>
        <label className="field-label">しゃべらせる文章<textarea disabled placeholder="例：ゲームスタートなのだ！" rows={3} /></label>
        <button className="primary-action" disabled type="button">準備中</button>
      </section>
    </div>
  )
}

export default App
