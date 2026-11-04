import type { SoundDefinition } from '../sounds'
import type { GravityUser } from './gravity-user'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export const communityApiConfigured = Boolean(API_BASE)

export async function listCommunitySounds(scope: 'community' | 'liked', user: GravityUser) {
  if (!API_BASE) return []
  const response = await fetch(`${API_BASE}/api/sounds?scope=${scope}`, { headers: userHeaders(user) })
  const data = await readResponse<{ sounds: SoundDefinition[] }>(response)
  return data.sounds
}

export async function listBuiltInLikes(user: GravityUser) {
  if (!API_BASE) return []
  const response = await fetch(`${API_BASE}/api/builtins/likes`, { headers: userHeaders(user) })
  const data = await readResponse<{ likes: Array<{ id: string; liked: boolean; likeCount: number }> }>(response)
  return data.likes
}

export async function setCommunityLike(soundId: string, liked: boolean, user: GravityUser) {
  const response = await fetch(`${API_BASE}/api/sounds/${encodeURIComponent(soundId)}/like`, {
    method: 'PUT',
    headers: { ...userHeaders(user), 'Content-Type': 'application/json' },
    body: JSON.stringify({ liked }),
  })
  return readResponse<{ liked: boolean; likeCount: number }>(response)
}

export async function setBuiltInLike(soundId: string, liked: boolean, user: GravityUser) {
  const response = await fetch(`${API_BASE}/api/builtins/${encodeURIComponent(soundId)}/like`, {
    method: 'PUT',
    headers: { ...userHeaders(user), 'Content-Type': 'application/json' },
    body: JSON.stringify({ liked }),
  })
  return readResponse<{ liked: boolean; likeCount: number }>(response)
}

export async function submitCommunitySound(input: { title: string; file: File; rightsConfirmed: boolean }, user: GravityUser) {
  const form = new FormData()
  form.set('title', input.title)
  form.set('file', input.file)
  form.set('rightsConfirmed', String(input.rightsConfirmed))
  const response = await fetch(`${API_BASE}/api/sounds`, {
    method: 'POST',
    headers: userHeaders(user),
    body: form,
  })
  return readResponse<{ id: string; status: 'approved'; message: string }>(response)
}

export async function synthesizeZundamon(text: string, user: GravityUser, signal?: AbortSignal) {
  if (!API_BASE) throw new Error('読み上げ機能の接続設定がありません')
  const response = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { ...userHeaders(user), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(data?.error || `音声を生成できませんでした（${response.status}）`)
  }
  if (!response.headers.get('Content-Type')?.toLowerCase().includes('audio/wav')) {
    throw new Error('サーバーから正しい音声が返りませんでした')
  }
  return response.blob()
}

function userHeaders(user: GravityUser) {
  return {
    'X-Gravity-User-Id': encodeURIComponent(user.id),
    'X-Gravity-User-Name': encodeURIComponent(user.name),
    ...(user.avatar ? { 'X-Gravity-User-Avatar': encodeURIComponent(user.avatar) } : {}),
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null) as (T & { error?: string }) | null
  if (!response.ok) throw new Error(data?.error || `通信に失敗しました（${response.status}）`)
  if (!data) throw new Error('サーバーから正しい応答がありません')
  return data
}
