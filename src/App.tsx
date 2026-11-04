import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import './App.css'
import { AudioEngine } from './lib/audio-engine'
import { communityApiConfigured, listBuiltInLikes, listCommunitySounds, setBuiltInLike, setCommunityLike, submitCommunitySound, synthesizeZundamon } from './lib/community-api'
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
  const [volume, setVolume] = useState(1)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playKey, setPlayKey] = useState(0)
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState<GravityUser | null>(null)
  const [builtInSounds, setBuiltInSounds] = useState<SoundDefinition[]>(SOUND_LIBRARY)
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
      const [community, liked, builtInLikes] = await Promise.all([
        listCommunitySounds('community', currentUser),
        listCommunitySounds('liked', currentUser),
        listBuiltInLikes(currentUser),
      ])
      const builtInLikeMap = new Map(builtInLikes.map((like) => [like.id, like]))
      setBuiltInSounds(SOUND_LIBRARY.map((sound) => ({ ...sound, ...builtInLikeMap.get(sound.id) })))
      setCommunitySounds(community)
      setLikedSounds(liked)
      setLibraryStatus('ready')
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'みんなの音を読み込めませんでした')
      setLibraryStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => void loadCommunity(user), 0)
    return () => window.clearTimeout(timer)
  }, [loadCommunity, user])

  const visibleSounds = useMemo(() => {
    if (activeTab === 'all') return [...builtInSounds, ...communitySounds]
    if (activeTab === 'builtIn') return builtInSounds
    if (activeTab === 'community') return communitySounds
    return [...builtInSounds.filter((sound) => sound.liked), ...likedSounds]
  }, [activeTab, builtInSounds, communitySounds, likedSounds])

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

  const updateSoundLike = (sound: SoundDefinition, liked: boolean, likeCount: number) => {
    if (sound.source === 'builtIn') {
      setBuiltInSounds((current) => current.map((item) => item.id === sound.id ? { ...item, liked, likeCount } : item))
      return
    }
    setCommunitySounds((current) => current.map((item) => item.id === sound.id ? { ...item, liked, likeCount } : item))
    setLikedSounds((current) => current.map((item) => item.id === sound.id ? { ...item, liked, likeCount } : item))
  }

  const toggleLike = async (sound: SoundDefinition) => {
    if (!user) return
    const nextLiked = !sound.liked
    const previousCount = sound.likeCount || 0
    const optimisticCount = Math.max(0, previousCount + (nextLiked ? 1 : -1))
    updateSoundLike(sound, nextLiked, optimisticCount)
    if (sound.source === 'community' && nextLiked) {
      setLikedSounds((current) => [{ ...sound, liked: true, likeCount: optimisticCount }, ...current.filter((item) => item.id !== sound.id)])
    } else if (sound.source === 'community') {
      setLikedSounds((current) => current.filter((item) => item.id !== sound.id))
    }
    try {
      const result = sound.source === 'builtIn'
        ? await setBuiltInLike(sound.id, nextLiked, user)
        : await setCommunityLike(sound.id, nextLiked, user)
      updateSoundLike(sound, result.liked, result.likeCount)
    } catch (error) {
      updateSoundLike(sound, Boolean(sound.liked), previousCount)
      if (sound.source === 'community' && nextLiked) setLikedSounds((current) => current.filter((item) => item.id !== sound.id))
      else if (sound.source === 'community') setLikedSounds((current) => [{ ...sound }, ...current.filter((item) => item.id !== sound.id)])
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

  const showCommunityLoading = communityApiConfigured
    && activeTab === 'community'
    && (libraryStatus === 'idle' || libraryStatus === 'loading')
    && communitySounds.length === 0
  const emptyState = getEmptyState(activeTab, libraryStatus, libraryError)

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><LogoIcon /><h1>効果音BOX</h1></div>
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

      <section aria-busy={showCommunityLoading} aria-label={SOUND_TABS.find((tab) => tab.id === activeTab)?.label} className="sound-grid" id="sound-grid" role="tabpanel">
        {showCommunityLoading ? <CommunityLoading /> : visibleSounds.map((sound) => (
          <SoundPad active={playingId === sound.id} key={`${sound.source}-${sound.id}`} onLike={communityApiConfigured ? () => void toggleLike(sound) : undefined} onPlay={() => void playSound(sound)} playKey={playingId === sound.id ? playKey : 0} sound={sound} />
        ))}
        {!showCommunityLoading && emptyState && visibleSounds.length === 0 && (
          <div className="empty-library">
            {activeTab === 'liked' ? <HeartIcon /> : <AddIcon />}
            <strong>{emptyState.title}</strong>
            <span>{emptyState.detail}</span>
            {libraryStatus === 'error' && user && <button onClick={() => void loadCommunity(user)} type="button">再読み込み</button>}
          </div>
        )}
      </section>

      <p className="sound-credit">
        効果音：<a href="https://otologic.jp/" rel="noreferrer" target="_blank">OtoLogic</a>
        （<a href="https://creativecommons.org/licenses/by/4.0/deed.ja" rel="noreferrer" target="_blank">CC BY 4.0</a>）
      </p>

      {notice && <p className="notice" role="status">{notice}</p>}

      <nav className="bottom-nav" aria-label="メインメニュー">
        <NavButton active={activeView === 'box'} icon={<GridIcon />} label="ボックス" onClick={() => setActiveView('box')} />
        <NavButton active={activeView === 'submit'} icon={<AddIcon />} label="音を投稿" onClick={() => setActiveView('submit')} />
        <NavButton active={activeView === 'voice'} icon={<VoiceIcon />} label="ずんだもん" onClick={() => setActiveView('voice')} />
      </nav>

      {activeView === 'submit' && <SubmitSoundSheet onClose={() => setActiveView('box')} onSubmitted={() => { setActiveView('box'); setNotice('投稿しました。みんなの音からすぐ使えます'); if (user) void loadCommunity(user) }} user={user} />}
      {activeView === 'voice' && <VoiceSheet audioRef={audio} onClose={() => setActiveView('box')} user={user} />}
    </main>
  )
}

function CommunityLoading() {
  return (
    <div className="library-loading" role="status">
      <div className="library-loading-label"><span aria-hidden="true" />みんなの音を読み込み中</div>
      <div aria-hidden="true" className="library-loading-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="sound-pad-skeleton" key={index}><i /><b /></div>
        ))}
      </div>
    </div>
  )
}

function getEmptyState(activeTab: SoundTabId, status: LibraryStatus, error: string) {
  if (activeTab !== 'community' && activeTab !== 'liked') return null
  if (!communityApiConfigured) return { title: '共有基盤の接続待ち', detail: 'Cloudflareの公開URLを設定すると使えるようになります' }
  if (status === 'loading' || status === 'idle') return { title: '音源を読み込み中', detail: '少しだけお待ちください' }
  if (status === 'error') return { title: 'みんなの音を読み込めません', detail: error }
  if (activeTab === 'liked') return { title: 'いいねした音源はありません', detail: '音源のハートを押すと、ここに保存されます' }
  return { title: 'みんなの音はまだありません', detail: '誰かが投稿すると、ここにすぐ追加されます' }
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
        <p>MP3・M4A・WAV、5MB以下。投稿すると、すぐにみんなの効果音BOXへ公開されます。</p>
        <form className="submit-form" onSubmit={(event) => void submit(event)}>
          <label className="field-label">音源名<input maxLength={30} onChange={(event) => setTitle(event.target.value)} placeholder="例：大成功！" value={title} /></label>
          <label className="file-picker"><input accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav" onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" /><span>{file ? file.name : '音声ファイルを選ぶ'}</span></label>
          <label className="rights-check"><input checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} type="checkbox" /><span>自作・CC0など、公開してよい権利を持つ音源です</span></label>
          {unavailable && <p className="form-message">Cloudflareの接続設定後に投稿できます</p>}
          {message && <p className="form-message is-error" role="alert">{message}</p>}
          <button className="primary-action" disabled={unavailable || submitting || !user || !file || !title.trim() || !rightsConfirmed} type="submit">{submitting ? '送信中…' : '投稿して公開'}</button>
        </form>
      </section>
    </div>
  )
}

function VoiceSheet({ audioRef, onClose, user }: { audioRef: RefObject<AudioEngine>; onClose: () => void; user: GravityUser | null }) {
  const [text, setText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [message, setMessage] = useState('')
  const request = useRef<AbortController | null>(null)
  const length = Array.from(text).length
  const unavailable = !communityApiConfigured || !user

  useEffect(() => () => request.current?.abort(), [])

  const close = () => {
    request.current?.abort()
    audioRef.current.stopAll()
    onClose()
  }

  const speak = async (event: FormEvent) => {
    event.preventDefault()
    if (playing) {
      audioRef.current.stopAll()
      setPlaying(false)
      return
    }
    const speech = text.trim()
    if (unavailable || !user || !speech || length > 80 || generating) return
    setMessage('')
    setGenerating(true)
    const controller = new AbortController()
    request.current = controller
    try {
      await audioRef.current.prepare()
      const blob = await synthesizeZundamon(speech, user, controller.signal)
      if (controller.signal.aborted) return
      audioRef.current.stopAll()
      setPlaying(true)
      await audioRef.current.playBlob(blob, () => setPlaying(false))
    } catch (error) {
      if (controller.signal.aborted) return
      setPlaying(false)
      setMessage(error instanceof Error ? error.message : '音声を生成できませんでした')
    } finally {
      if (request.current === controller) request.current = null
      if (!controller.signal.aborted) setGenerating(false)
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section aria-labelledby="voice-title" aria-modal="true" className="bottom-sheet voice-sheet" role="dialog">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header"><h2 id="voice-title">ずんだもん</h2><button onClick={close} type="button">閉じる</button></div>
        <div className="voice-mark"><VoiceIcon /></div>
        <h3>好きな言葉を効果音に</h3>
        <p>ずんだもん（ノーマル）でその場で読み上げます。入力した文章と生成音声は保存しません。</p>
        <form aria-busy={generating} className="voice-form" onSubmit={(event) => void speak(event)}>
          <label className="field-label">
            <span className="field-heading"><span>しゃべらせる文章</span><span className={length > 80 ? 'is-over' : ''}>{length}/80</span></span>
            <textarea disabled={generating} maxLength={80} onChange={(event) => setText(event.target.value)} placeholder="例：ゲームスタートなのだ！" rows={3} value={text} />
          </label>
          <p className="voice-note">初回は読み上げサーバーの起動に30〜90秒ほどかかる場合があります。</p>
          {!communityApiConfigured && <p className="form-message">読み上げサーバーの接続設定後に使えます</p>}
          {communityApiConfigured && !user && <p className="form-message">GRAVITYのユーザー情報を確認中です</p>}
          {message && <p className="form-message is-error" role="alert">{message}</p>}
          <button className={playing ? 'primary-action is-stop' : 'primary-action'} disabled={!playing && (unavailable || generating || !text.trim() || length > 80)} type="submit">
            {generating ? '音声を生成中…' : playing ? '読み上げを止める' : 'ずんだもんで読み上げる'}
          </button>
        </form>
        <p className="voice-credit">音声：<a href="https://voicevox.hiroshiba.jp/" rel="noreferrer" target="_blank">VOICEVOX:ずんだもん</a></p>
      </section>
    </div>
  )
}

export default App
