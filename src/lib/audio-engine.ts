export class AudioEngine {
  private static readonly MAX_OUTPUT_VOLUME = 0.09
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private volume = 1
  private buffers = new Map<string, Promise<AudioBuffer>>()
  private active = new Set<AudioBufferSourceNode>()
  private activeMedia = new Map<HTMLAudioElement, () => void>()

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.outputVolume, this.context.currentTime, 0.015)
    }
    for (const media of this.activeMedia.keys()) media.volume = this.outputVolume
  }

  async prepare() {
    const context = this.ensureContext()
    if (context?.state === 'suspended') await context.resume()
  }

  async play(_id: string, url: string, onEnded?: () => void) {
    const context = this.ensureContext()
    if (!context) {
      await this.playWithMediaElement(url, onEnded)
      return
    }

    try {
      await this.prepare()
      const buffer = await this.loadBuffer(context, url)
      this.playBuffer(context, buffer, onEnded)
    } catch {
      await this.playWithMediaElement(url, onEnded)
    }
  }

  async playBlob(blob: Blob, onEnded?: () => void) {
    const context = this.ensureContext()
    if (context) {
      try {
        await this.prepare()
        const buffer = await context.decodeAudioData(await blob.arrayBuffer())
        this.playBuffer(context, buffer, onEnded)
        return
      } catch {
        // iOS WebViewによってはWAVのdecodeAudioDataが失敗するためHTML Audioへ切り替える。
      }
    }
    const url = URL.createObjectURL(blob)
    await this.playWithMediaElement(url, onEnded, () => URL.revokeObjectURL(url))
  }

  stopAll() {
    for (const source of this.active) {
      try { source.stop() } catch { /* already stopped */ }
    }
    this.active.clear()
    for (const cleanup of [...this.activeMedia.values()]) cleanup()
    this.activeMedia.clear()
  }

  destroy() {
    this.stopAll()
    void this.context?.close()
    this.context = null
    this.master = null
    this.buffers.clear()
  }

  private ensureContext() {
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext ?? (globalThis as typeof globalThis & {
        webkitAudioContext?: typeof AudioContext
      }).webkitAudioContext
      if (!AudioContextClass) return null
      this.context = new AudioContextClass()
      this.master = this.context.createGain()
      this.master.gain.value = this.outputVolume
      this.master.connect(this.context.destination)
    }
    return this.context
  }

  private playBuffer(context: AudioContext, buffer: AudioBuffer, onEnded?: () => void) {
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(this.master!)
    this.active.add(source)
    source.onended = () => {
      this.active.delete(source)
      source.disconnect()
      onEnded?.()
    }
    source.start()
  }

  private async playWithMediaElement(url: string, onEnded?: () => void, onDispose?: () => void) {
    const media = document.createElement('audio')
    media.src = url
    media.preload = 'auto'
    media.volume = this.outputVolume
    media.hidden = true
    document.body.append(media)

    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      this.activeMedia.delete(media)
      media.onended = null
      media.onerror = null
      media.pause()
      media.removeAttribute('src')
      media.load()
      media.remove()
      onDispose?.()
    }
    this.activeMedia.set(media, cleanup)
    media.onended = () => {
      cleanup()
      onEnded?.()
    }
    media.onerror = cleanup

    try {
      await media.play()
    } catch (error) {
      cleanup()
      throw error
    }
  }

  private loadBuffer(context: AudioContext, url: string) {
    const cached = this.buffers.get(url)
    if (cached) return cached
    const request = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Audio request failed: ${response.status}`)
        return response.arrayBuffer()
      })
      .then((data) => context.decodeAudioData(data))
      .catch((error) => {
        this.buffers.delete(url)
        throw error
      })
    this.buffers.set(url, request)
    return request
  }

  private get outputVolume() {
    return this.volume * AudioEngine.MAX_OUTPUT_VOLUME
  }
}
