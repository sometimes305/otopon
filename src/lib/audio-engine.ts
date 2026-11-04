export class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private volume = 0.82
  private buffers = new Map<string, Promise<AudioBuffer>>()
  private active = new Set<AudioBufferSourceNode>()

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.015)
    }
  }

  async play(_id: string, url: string, onEnded?: () => void) {
    const context = this.ensureContext()
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
  }

  stopAll() {
    for (const source of this.active) {
      try { source.stop() } catch { /* already stopped */ }
    }
    this.active.clear()
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
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.context.destination)
    }
    return this.context
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
