export interface GravityUser {
  id: string
  name: string
  avatar: string | null
  source: 'gravity' | 'device'
}

type RawProfile = Record<string, unknown>

const NAME_KEYS = ['name', 'nickname', 'username', 'user_name', 'userName', 'nick_name', 'nickName']
const ID_KEYS = ['id', 'user_id', 'userId', 'open_id', 'openId', 'uid']
const AVATAR_KEYS = ['portrait', 'avatar', 'icon', 'avatar_url', 'avatarUrl', 'head_img', 'headimgurl', 'profile_image', 'profileImage']

declare global {
  interface Window {
    AgentSDK?: {
      user?: { getMyUserInfo?: () => Promise<unknown> | unknown }
    }
    ReactNativeWebView?: { postMessage?: (message: string) => void }
  }
}

export async function getCurrentUser(): Promise<GravityUser> {
  const queryProfile = profileFromQuery()
  if (queryProfile) return queryProfile

  try {
    if (window.AgentSDK?.user?.getMyUserInfo) {
      const raw = await withTimeout(Promise.resolve(window.AgentSDK.user.getMyUserInfo()), 4500)
      const profile = normalizeProfile(raw)
      if (profile) return profile
    }
    if (isInsideGravity()) {
      const profile = normalizeProfile(await requestLegacyProfile())
      if (profile) return profile
    }
  } catch {
    // Development browsers and older loaders use a stable device identity.
  }

  return deviceUser()
}

function profileFromQuery() {
  const params = Object.fromEntries(new URLSearchParams(window.location.search).entries())
  return normalizeProfile(params)
}

function normalizeProfile(raw: unknown): GravityUser | null {
  const record = asRecord(raw)
  const root = asRecord(record?.data) || asRecord(record?.payload) || asRecord(record?.result) || record
  const value = asRecord(root?.user) || asRecord(root?.userInfo) || asRecord(root?.user_info) || asRecord(root?.profile) || root
  if (!value) return null
  const name = firstString(value, NAME_KEYS)
  if (!name) return null
  const id = firstString(value, ID_KEYS) || name
  const avatar = firstString(value, AVATAR_KEYS) || null
  return { id, name, avatar, source: 'gravity' }
}

function requestLegacyProfile() {
  return new Promise<unknown>((resolve, reject) => {
    const requestId = `otopon_profile_${Date.now()}`
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('profile timeout'))
    }, 4500)
    const onMessage = (event: MessageEvent) => {
      const data = asRecord(event.data)
      if (!data) return
      const matchingCallback = data.type === 'API_CALLBACK' && (data.requestId === requestId || data.id === requestId)
      const profileEvent = data.type === 'USER_INFO' || data.type === 'user_info' || data.action === 'AgentSDK.user.getMyUserInfo'
      if (!matchingCallback && !profileEvent) return
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve(data.result || data.payload || data.data || data)
    }
    window.addEventListener('message', onMessage)
    const message = { type: 'API', action: 'AgentSDK.user.getMyUserInfo', requestId, params: {} }
    try { window.parent.postMessage(message, '*') } catch { /* unavailable */ }
    try { window.ReactNativeWebView?.postMessage?.(JSON.stringify(message)) } catch { /* unavailable */ }
  })
}

function isInsideGravity() {
  const params = new URLSearchParams(window.location.search)
  return window.self !== window.top || Boolean(window.ReactNativeWebView) || ['username', 'userName', 'user_id'].some((key) => params.has(key))
}

function deviceUser(): GravityUser {
  const key = 'otopon-device-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = `device-${crypto.randomUUID()}`
    localStorage.setItem(key, id)
  }
  return { id, name: 'ゲスト', avatar: null, source: 'device' }
}

function asRecord(value: unknown): RawProfile | null {
  return value && typeof value === 'object' ? value as RawProfile : null
}

function firstString(record: RawProfile, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), timeoutMs)
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value) },
      (error) => { window.clearTimeout(timer); reject(error) },
    )
  })
}
