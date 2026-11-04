import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './App.css'
import { AudioEngine } from './lib/audio-engine'
import { SOUND_LIBRARY, SOUND_TABS, type SoundDefinition, type SoundTabId } from './sounds'
import { AddIcon, GridIcon, HeartIcon, LogoIcon, StopIcon, VoiceIcon, VolumeIcon } from './ui/Icons'
import { SoundPad } from './ui/SoundPad'

type ActiveView = 'box' | 'submit' | 'voice'

const EMPTY_STATES: Record<Exclude<SoundTabId, 'all' | 'builtIn'>, { title: string; detail: string }> = {
  community: {
    title: '投稿音源はまだありません',
    detail: '共有機能の公開後、ここに追加されます',
  },
  liked: {
    title: 'いいねした音源はありません',
    detail: 'ログイン機能の公開後、ここに保存されます',
  },
}

function App() {
  const audio = useRef(new AudioEngine())
  const [activeView, setActiveView] = useState<ActiveView>('box')
  const [activeTab, setActiveTab] = useState<SoundTabId>('all')
  const [volume, setVolume] = useState(0.82)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playKey, setPlayKey] = useState(0)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const audioEngine = audio.current
    return () => audioEngine.destroy()
  }, [])

  useEffect(() => {
    audio.current.setVolume(volume)
  }, [volume])

  const visibleSounds = useMemo(() => {
    if (activeTab === 'all') return SOUND_LIBRARY
    if (activeTab === 'builtIn') return SOUND_LIBRARY.filter((sound) => sound.source === 'builtIn')
    if (activeTab === 'community') return SOUND_LIBRARY.filter((sound) => sound.source === 'community')
    return SOUND_LIBRARY.filter((sound) => sound.liked)
  }, [activeTab])

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

  const stopAll = () => {
    audio.current.stopAll()
    setPlayingId(null)
  }

  const selectTab = (tab: SoundTabId) => {
    setActiveTab(tab)
    setActiveView('box')
    setNotice('')
  }

  const emptyState = activeTab === 'community' || activeTab === 'liked' ? EMPTY_STATES[activeTab] : null

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><LogoIcon /><h1>音ポン</h1></div>
        <div className="sync-state sync-state--connected">
          <span aria-hidden="true" />
          マイクONでルームへ
        </div>
      </header>

      <section className="category-tabs" aria-label="音源の表示範囲" role="tablist">
        {SOUND_TABS.map((tab) => (
          <button
            aria-controls="sound-grid"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'category-tab is-active' : 'category-tab'}
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
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

      <section aria-label={SOUND_TABS.find((tab) => tab.id === activeTab)?.label} className="sound-grid" id="sound-grid" role="tabpanel">
        {visibleSounds.map((sound) => (
          <SoundPad active={playingId === sound.id} key={sound.id} playKey={playingId === sound.id ? playKey : 0} sound={sound} onPlay={() => void playSound(sound)} />
        ))}
        {emptyState && visibleSounds.length === 0 && (
          <div className="empty-library">
            {activeTab === 'community' ? <AddIcon /> : <HeartIcon />}
            <strong>{emptyState.title}</strong>
            <span>{emptyState.detail}</span>
          </div>
        )}
      </section>

      {notice && <p className="notice" role="status">{notice}</p>}

      <nav className="bottom-nav" aria-label="メインメニュー">
        <NavButton active={activeView === 'box'} icon={<GridIcon />} label="ボックス" onClick={() => setActiveView('box')} />
        <NavButton active={activeView === 'submit'} icon={<AddIcon />} label="音を投稿" onClick={() => setActiveView('submit')} />
        <NavButton active={activeView === 'voice'} icon={<VoiceIcon />} label="ずんだもん" onClick={() => setActiveView('voice')} />
      </nav>

      {activeView === 'submit' && <SubmitSoundSheet onClose={() => setActiveView('box')} />}
      {activeView === 'voice' && <VoiceSheet onClose={() => setActiveView('box')} />}
    </main>
  )
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'nav-button is-active' : 'nav-button'} onClick={onClick} type="button">{icon}<span>{label}</span></button>
}

function SubmitSoundSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="submit-title" aria-modal="true" className="bottom-sheet submit-sheet" role="dialog">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header"><h2 id="submit-title">音を投稿</h2><button onClick={onClose} type="button">閉じる</button></div>
        <div className="submit-mark"><AddIcon /></div>
        <h3>みんなが使える音源を投稿</h3>
        <p>音源の権利確認、通報、削除の仕組みを整えてから公開します。端末内だけに保存する機能は使用しません。</p>
        <button className="primary-action" disabled type="button">投稿機能は準備中</button>
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
