export class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private volume = 0.82
  private buffers = new Map<string, Promise<AudioBuffer>>()
  private active = new Set<AudioBufferSourceNode>()
  private activeMedia = new Set<HTMLAudioElement>()

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.015)
    }
    for (const media of this.activeMedia) media.volume = this.volume
  }

  async play(_id: string, url: string, onEnded?: () => void) {
    const context = this.ensureContext()
    if (!context) {
      await this.playWithMediaElement(url, onEnded)
      return
    }

    try {
      if (context.state === 'suspended') await context.resume()
      const buffer = await this.loadBuffer(context, url)
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
    } catch {
      await this.playWithMediaElement(url, onEnded)
    }
  }

  stopAll() {
    for (const source of this.active) {
      try { source.stop() } catch { /* already stopped */ }
    }
    this.active.clear()
    for (const media of this.activeMedia) {
      media.onended = null
      media.onerror = null
      media.pause()
      media.removeAttribute('src')
      media.load()
      media.remove()
    }
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
      this.master.gain.value = this.volume
      this.master.connect(this.context.destination)
    }
    return this.context
  }

  private async playWithMediaElement(url: string, onEnded?: () => void) {
    const media = document.createElement('audio')
    media.src = url
    media.preload = 'auto'
    media.volume = this.volume
    media.hidden = true
    document.body.append(media)
    this.activeMedia.add(media)

    const cleanup = () => {
      this.activeMedia.delete(media)
      media.remove()
    }
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
}
