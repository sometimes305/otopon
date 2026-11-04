import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import './App.css'
import { AudioEngine } from './lib/audio-engine'
import { communityApiConfigured, listCommunitySounds, setCommunityLike, submitCommunitySound } from './lib/community-api'
import { getCurrentUser, type GravityUser } from './lib/gravity-user'
import { SOUND_LIBRARY, SOUND_TABS, type SoundDefinition, type SoundTabId } from './sounds'
import { AddIcon, GridIcon, HeartIcon, LogoIcon, StopIcon, VoiceIcon, VolumeIcon } from './ui/Icons'
import { SoundPad } from './ui/SoundPad'

type ActiveView = 'box' | 'submit' | 'voice'
type LibraryStatus = 'idle' | 'loading' | 'ready' | 'error'

function App() {
  const audio = useRef(new AudioEngine())
  const [activeView, setActiveView] = useState<ActiveView>('box')
  const [activeTab, setActiveTab] = useState<SoundTabId>('all')
  const [volume, setVolume] = useState(0.82)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playKey, setPlayKey] = useState(0)
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState<GravityUser | null>(null)
  const [communitySounds, setCommunitySounds] = useState<SoundDefinition[]>([])
  const [likedSounds, setLikedSounds] = useState<SoundDefinition[]>([])
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>('idle')
  const [libraryError, setLibraryError] = useState('')

  useEffect(() => {
    const audioEngine = audio.current
    void getCurrentUser().then(setUser)
    return () => audioEngine.destroy()
  }, [])

  useEffect(() => {
    audio.current.setVolume(volume)
  }, [volume])

  const loadCommunity = useCallback(async (currentUser: GravityUser) => {
    if (!communityApiConfigured) return
    setLibraryStatus('loading')
    setLibraryError('')
    try {
      const [community, liked] = await Promise.all([
        listCommunitySounds('community', currentUser),
        listCommunitySounds('liked', currentUser),
      ])
      setCommunitySounds(community)
      setLikedSounds(liked)
      setLibraryStatus('ready')
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : '投稿音源を読み込めませんでした')
      setLibraryStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => void loadCommunity(user), 0)
    return () => window.clearTimeout(timer)
  }, [loadCommunity, user])

  const visibleSounds = useMemo(() => {
    if (activeTab === 'all') return [...SOUND_LIBRARY, ...communitySounds]
    if (activeTab === 'builtIn') return SOUND_LIBRARY
    if (activeTab === 'community') return communitySounds
    return likedSounds
  }, [activeTab, communitySounds, likedSounds])

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

  const updateSoundLike = (id: string, liked: boolean, likeCount: number) => {
    setCommunitySounds((current) => current.map((sound) => sound.id === id ? { ...sound, liked, likeCount } : sound))
    setLikedSounds((current) => current.map((sound) => sound.id === id ? { ...sound, liked, likeCount } : sound))
  }

  const toggleLike = async (sound: SoundDefinition) => {
    if (!user) return
    const nextLiked = !sound.liked
    const previousCount = sound.likeCount || 0
    const optimisticCount = Math.max(0, previousCount + (nextLiked ? 1 : -1))
    updateSoundLike(sound.id, nextLiked, optimisticCount)
    if (nextLiked) {
      setLikedSounds((current) => [{ ...sound, liked: true, likeCount: optimisticCount }, ...current.filter((item) => item.id !== sound.id)])
    } else {
      setLikedSounds((current) => current.filter((item) => item.id !== sound.id))
    }
    try {
      const result = await setCommunityLike(sound.id, nextLiked, user)
      updateSoundLike(sound.id, result.liked, result.likeCount)
    } catch (error) {
      updateSoundLike(sound.id, Boolean(sound.liked), previousCount)
      if (nextLiked) setLikedSounds((current) => current.filter((item) => item.id !== sound.id))
      else setLikedSounds((current) => [{ ...sound }, ...current.filter((item) => item.id !== sound.id)])
      setNotice(error instanceof Error ? error.message : 'いいねを保存できませんでした')
    }
  }

  const stopAll = () => {
    audio.current.stopAll()
    setPlayingId(null)
  }

  const selectTab = (tab: SoundTabId) => {
    setActiveTab(tab)
    setActiveView('box')
    setNotice('')
  }

  const emptyState = getEmptyState(activeTab, libraryStatus, libraryError)

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><LogoIcon /><h1>音ポン</h1></div>
        <div className="sync-state sync-state--connected"><span aria-hidden="true" />マイクONでルームへ</div>
      </header>

      <section className="category-tabs" aria-label="音源の表示範囲" role="tablist">
        {SOUND_TABS.map((tab) => (
          <button aria-controls="sound-grid" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'category-tab is-active' : 'category-tab'} key={tab.id} onClick={() => selectTab(tab.id)} role="tab" type="button">
            {tab.label}
          </button>
        ))}
      </section>

      <section className="mixer-strip">
        <button className="stop-button" onClick={stopAll} type="button"><StopIcon /> 全停止</button>
        <label className="volume-control">
          <VolumeIcon /><span>音量</span>
          <input aria-label="効果音の音量" max="1" min="0" onChange={(event) => setVolume(Number(event.target.value))} step="0.01" type="range" value={volume} />
        </label>
      </section>

      <section aria-label={SOUND_TABS.find((tab) => tab.id === activeTab)?.label} className="sound-grid" id="sound-grid" role="tabpanel">
        {visibleSounds.map((sound) => (
          <SoundPad active={playingId === sound.id} key={sound.id} onLike={sound.source === 'community' ? () => void toggleLike(sound) : undefined} onPlay={() => void playSound(sound)} playKey={playingId === sound.id ? playKey : 0} sound={sound} />
        ))}
        {emptyState && visibleSounds.length === 0 && (
          <div className="empty-library">
            {activeTab === 'liked' ? <HeartIcon /> : <AddIcon />}
            <strong>{emptyState.title}</strong>
            <span>{emptyState.detail}</span>
            {libraryStatus === 'error' && user && <button onClick={() => void loadCommunity(user)} type="button">再読み込み</button>}
          </div>
        )}
      </section>

      {notice && <p className="notice" role="status">{notice}</p>}

      <nav className="bottom-nav" aria-label="メインメニュー">
        <NavButton active={activeView === 'box'} icon={<GridIcon />} label="ボックス" onClick={() => setActiveView('box')} />
        <NavButton active={activeView === 'submit'} icon={<AddIcon />} label="音を投稿" onClick={() => setActiveView('submit')} />
        <NavButton active={activeView === 'voice'} icon={<VoiceIcon />} label="ずんだもん" onClick={() => setActiveView('voice')} />
      </nav>

      {activeView === 'submit' && <SubmitSoundSheet onClose={() => setActiveView('box')} onSubmitted={() => { setActiveView('box'); setNotice('投稿を受け付けました。承認後に投稿音源へ表示されます') }} user={user} />}
      {activeView === 'voice' && <VoiceSheet onClose={() => setActiveView('box')} />}
    </main>
  )
}

function getEmptyState(activeTab: SoundTabId, status: LibraryStatus, error: string) {
  if (activeTab !== 'community' && activeTab !== 'liked') return null
  if (!communityApiConfigured) return { title: '共有基盤の接続待ち', detail: 'Cloudflareの公開URLを設定すると使えるようになります' }
  if (status === 'loading' || status === 'idle') return { title: '音源を読み込み中', detail: '少しだけお待ちください' }
  if (status === 'error') return { title: '投稿音源を読み込めません', detail: error }
  if (activeTab === 'liked') return { title: 'いいねした音源はありません', detail: '投稿音源のハートを押すと、ここに保存されます' }
  return { title: '投稿音源はまだありません', detail: '承認された音源がここに追加されます' }
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'nav-button is-active' : 'nav-button'} onClick={onClick} type="button">{icon}<span>{label}</span></button>
}

function SubmitSoundSheet({ onClose, onSubmitted, user }: { onClose: () => void; onSubmitted: () => void; user: GravityUser | null }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !file || !title.trim() || !rightsConfirmed || !communityApiConfigured) return
    if (file.size > 5 * 1024 * 1024) {
      setMessage('音声ファイルは5MB以下にしてください')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await submitCommunitySound({ title: title.trim(), file, rightsConfirmed }, user)
      onSubmitted()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '投稿できませんでした')
    } finally {
      setSubmitting(false)
    }
  }

  const unavailable = !communityApiConfigured
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="submit-title" aria-modal="true" className="bottom-sheet submit-sheet" role="dialog">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header"><h2 id="submit-title">音を投稿</h2><button onClick={onClose} type="button">閉じる</button></div>
        <div className="submit-mark"><AddIcon /></div>
        <h3>みんなが使える音源を投稿</h3>
        <p>MP3・M4A・WAV、5MB以下。投稿後は審査され、承認された音源だけ公開されます。</p>
        <form className="submit-form" onSubmit={(event) => void submit(event)}>
          <label className="field-label">音源名<input maxLength={30} onChange={(event) => setTitle(event.target.value)} placeholder="例：大成功！" value={title} /></label>
          <label className="file-picker"><input accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav" onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" /><span>{file ? file.name : '音声ファイルを選ぶ'}</span></label>
          <label className="rights-check"><input checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} type="checkbox" /><span>自作・CC0など、公開してよい権利を持つ音源です</span></label>
          {unavailable && <p className="form-message">Cloudflareの接続設定後に投稿できます</p>}
          {message && <p className="form-message is-error" role="alert">{message}</p>}
          <button className="primary-action" disabled={unavailable || submitting || !user || !file || !title.trim() || !rightsConfirmed} type="submit">{submitting ? '送信中…' : '審査へ投稿'}</button>
        </form>
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
