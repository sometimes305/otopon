interface Env {
  DB: D1Database
  AUDIO: KVNamespace
  ALLOWED_ORIGINS: string
  ADMIN_TOKEN?: string
}

interface SoundRow {
  id: string
  title: string
  color: SoundColor
  mime_type: string
  size_bytes: number
  uploader_id: string
  uploader_name: string
  like_count: number
  created_at: string
  liked: number
  status?: SoundStatus
}

type SoundColor = 'coral' | 'mint' | 'amber' | 'blue' | 'violet' | 'pink'
type SoundStatus = 'pending' | 'approved' | 'rejected' | 'hidden'

interface AudioMetadata {
  contentType: string
  uploaderId: string
  originalName: string
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_PENDING_PER_HOUR = 3
const COLORS: SoundColor[] = ['coral', 'mint', 'amber', 'blue', 'violet', 'pink']
const BUILTIN_SOUND_IDS = [
  'tada', 'big-win', 'victory-8bit', 'level-up', 'item-get', 'game-over',
  'too-bad', 'danger', 'reveal', 'decision', 'entrance', 'punchline',
  'sparkle', 'success-8bit', 'fail-8bit', 'select-8bit', 'impact-don',
  'impact-pon', 'zukeen', 'chime-hit', 'coins', 'dice', 'card-shuffle', 'metal-crash',
] as const
const BUILTIN_SOUND_ID_SET = new Set<string>(BUILTIN_SOUND_IDS)

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const origin = request.headers.get('Origin')
    const cors = corsHeaders(origin, env)

    if (request.method === 'OPTIONS') {
      if (origin && !cors.has('Access-Control-Allow-Origin')) return json({ error: '許可されていない接続元です' }, 403)
      return new Response(null, { status: 204, headers: cors })
    }

    try {
      const response = await route(request, env)
      for (const [key, value] of cors) response.headers.set(key, value)
      return response
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500
      const message = error instanceof HttpError ? error.message : 'サーバーでエラーが発生しました'
      if (!(error instanceof HttpError)) console.error(error)
      return json({ error: message }, status, cors)
    }
  },
} satisfies ExportedHandler<Env>

async function route(request: Request, env: Env) {
  const url = new URL(request.url)
  const parts = url.pathname.split('/').filter(Boolean)

  if (request.method === 'GET' && url.pathname === '/health') {
    return json({ ok: true, service: 'otopon-api' })
  }

  if (request.method === 'GET' && url.pathname === '/api/sounds') {
    return listSounds(request, env)
  }

  if (request.method === 'GET' && url.pathname === '/api/builtins/likes') {
    return listBuiltInLikes(request, env)
  }

  if (request.method === 'POST' && url.pathname === '/api/sounds') {
    requireAllowedWriteOrigin(request, env)
    return createSound(request, env)
  }

  if (parts[0] === 'api' && parts[1] === 'sounds' && parts[2] && parts[3] === 'audio' && request.method === 'GET') {
    return streamAudio(request, env, parts[2])
  }

  if (parts[0] === 'api' && parts[1] === 'sounds' && parts[2] && parts[3] === 'like' && request.method === 'PUT') {
    requireAllowedWriteOrigin(request, env)
    return setLike(request, env, parts[2])
  }

  if (parts[0] === 'api' && parts[1] === 'builtins' && parts[2] && parts[3] === 'like' && request.method === 'PUT') {
    requireAllowedWriteOrigin(request, env)
    return setBuiltInLike(request, env, parts[2])
  }

  if (parts[0] === 'api' && parts[1] === 'sounds' && parts[2] && parts[3] === 'report' && request.method === 'POST') {
    requireAllowedWriteOrigin(request, env)
    return reportSound(request, env, parts[2])
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/sounds') {
    requireAdmin(request, env)
    return listAdminSounds(request, env)
  }

  if (parts[0] === 'api' && parts[1] === 'admin' && parts[2] === 'sounds' && parts[3] && parts[4] === 'audio' && request.method === 'GET') {
    requireAdmin(request, env)
    return streamAdminAudio(request, env, parts[3])
  }

  if (parts[0] === 'api' && parts[1] === 'admin' && parts[2] === 'sounds' && parts[3] && request.method === 'PUT') {
    requireAdmin(request, env)
    return reviewSound(request, env, parts[3])
  }

  throw new HttpError(404, 'APIが見つかりません')
}

async function listSounds(request: Request, env: Env) {
  const url = new URL(request.url)
  const scope = url.searchParams.get('scope') === 'liked' ? 'liked' : 'community'
  const userId = cleanHeader(request.headers.get('X-Gravity-User-Id'), 128)
  if (scope === 'liked' && !userId) return json({ sounds: [] })

  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 60, 1), 100)
  const where = scope === 'liked' ? 'AND EXISTS (SELECT 1 FROM likes mine WHERE mine.sound_id = s.id AND mine.user_id = ?)' : ''
  const params: Array<string | number> = [userId || '', ...(scope === 'liked' ? [userId!] : []), limit]
  const result = await env.DB.prepare(`
    SELECT s.id, s.title, s.color, s.mime_type, s.size_bytes, s.uploader_id,
      u.display_name AS uploader_name, s.like_count, s.created_at,
      EXISTS (SELECT 1 FROM likes l WHERE l.sound_id = s.id AND l.user_id = ?) AS liked
    FROM sounds s
    JOIN users u ON u.id = s.uploader_id
    WHERE s.status = 'approved' ${where}
    ORDER BY s.created_at DESC
    LIMIT ?
  `).bind(...params).all<SoundRow>()

  return json({ sounds: result.results.map((row) => publicSound(row, url.origin)) })
}

async function createSound(request: Request, env: Env) {
  const user = requireUser(request)
  const form = await request.formData()
  const title = cleanText(form.get('title'), 30)
  const rightsConfirmed = form.get('rightsConfirmed') === 'true'
  const file = form.get('file')
  if (!title) throw new HttpError(400, '音源名を入力してください')
  if (!rightsConfirmed) throw new HttpError(400, '投稿できる権利を持つ音源であることを確認してください')
  if (!(file instanceof File)) throw new HttpError(400, '音声ファイルを選んでください')
  if (file.size < 1 || file.size > MAX_FILE_BYTES) throw new HttpError(400, '音声ファイルは5MB以下にしてください')

  const bytes = await file.arrayBuffer()
  const mimeType = detectAudioType(new Uint8Array(bytes))
  if (!mimeType) throw new HttpError(400, 'MP3・M4A・WAV形式の音声だけ投稿できます')

  await upsertUser(env, user)
  const recent = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM sounds
    WHERE uploader_id = ? AND created_at >= datetime('now', '-1 hour')
  `).bind(user.id).first<{ count: number }>()
  if ((recent?.count || 0) >= MAX_PENDING_PER_HOUR) throw new HttpError(429, '投稿は1時間に3件までです')

  const id = crypto.randomUUID()
  const extension = mimeType === 'audio/wav' ? 'wav' : mimeType === 'audio/mpeg' ? 'mp3' : 'm4a'
  const objectKey = `audio/${id}.${extension}`
  const hash = await sha256(bytes)
  const existing = await env.DB.prepare("SELECT id FROM sounds WHERE sha256 = ? AND status IN ('approved', 'hidden')").bind(hash).first()
  if (existing) throw new HttpError(409, '同じ音源はすでに投稿されています')

  await env.AUDIO.put(objectKey, bytes, {
    metadata: { contentType: mimeType, uploaderId: user.id, originalName: file.name.slice(0, 120) },
  })

  try {
    await env.DB.prepare(`
      INSERT INTO sounds (id, title, color, object_key, mime_type, size_bytes, sha256, uploader_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')
    `).bind(id, title, colorForId(id), objectKey, mimeType, file.size, hash, user.id).run()
  } catch (error) {
    await env.AUDIO.delete(objectKey)
    throw error
  }

  return json({ id, status: 'approved', message: '投稿音源として公開しました' }, 201)
}

async function listBuiltInLikes(request: Request, env: Env) {
  const userId = cleanHeader(request.headers.get('X-Gravity-User-Id'), 128)
  const placeholders = BUILTIN_SOUND_IDS.map(() => '?').join(', ')
  const result = await env.DB.prepare(`
    SELECT sound_id, COUNT(*) AS like_count,
      MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS liked
    FROM builtin_likes
    WHERE sound_id IN (${placeholders})
    GROUP BY sound_id
  `).bind(userId || '', ...BUILTIN_SOUND_IDS).all<{ sound_id: string; like_count: number; liked: number }>()
  return json({ likes: result.results.map((row) => ({ id: row.sound_id, likeCount: row.like_count, liked: Boolean(row.liked) })) })
}

async function setBuiltInLike(request: Request, env: Env, soundId: string) {
  if (!BUILTIN_SOUND_ID_SET.has(soundId)) throw new HttpError(404, '初期音源が見つかりません')
  const user = requireUser(request)
  const body = await readJson<{ liked?: unknown }>(request)
  if (typeof body.liked !== 'boolean') throw new HttpError(400, 'likedにはtrueかfalseを指定してください')
  await upsertUser(env, user)
  if (body.liked) {
    await env.DB.prepare('INSERT OR IGNORE INTO builtin_likes (sound_id, user_id) VALUES (?, ?)').bind(soundId, user.id).run()
  } else {
    await env.DB.prepare('DELETE FROM builtin_likes WHERE sound_id = ? AND user_id = ?').bind(soundId, user.id).run()
  }
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM builtin_likes WHERE sound_id = ?').bind(soundId).first<{ count: number }>()
  return json({ liked: body.liked, likeCount: count?.count || 0 })
}

async function setLike(request: Request, env: Env, soundId: string) {
  const user = requireUser(request)
  const sound = await env.DB.prepare("SELECT id FROM sounds WHERE id = ? AND status = 'approved'").bind(soundId).first()
  if (!sound) throw new HttpError(404, '音源が見つかりません')
  const body = await readJson<{ liked?: unknown }>(request)
  if (typeof body.liked !== 'boolean') throw new HttpError(400, 'likedにはtrueかfalseを指定してください')
  await upsertUser(env, user)

  const change = body.liked
    ? env.DB.prepare('INSERT OR IGNORE INTO likes (sound_id, user_id) VALUES (?, ?)').bind(soundId, user.id)
    : env.DB.prepare('DELETE FROM likes WHERE sound_id = ? AND user_id = ?').bind(soundId, user.id)
  await env.DB.batch([
    change,
    env.DB.prepare('UPDATE sounds SET like_count = (SELECT COUNT(*) FROM likes WHERE sound_id = ?) WHERE id = ?').bind(soundId, soundId),
  ])
  const updated = await env.DB.prepare('SELECT like_count FROM sounds WHERE id = ?').bind(soundId).first<{ like_count: number }>()
  return json({ liked: body.liked, likeCount: updated?.like_count || 0 })
}

async function reportSound(request: Request, env: Env, soundId: string) {
  const user = requireUser(request)
  const body = await readJson<{ reason?: unknown }>(request)
  const reason = cleanText(body.reason, 200)
  if (!reason) throw new HttpError(400, '通報理由を入力してください')
  const sound = await env.DB.prepare("SELECT id FROM sounds WHERE id = ? AND status = 'approved'").bind(soundId).first()
  if (!sound) throw new HttpError(404, '音源が見つかりません')
  await upsertUser(env, user)
  const id = crypto.randomUUID()
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO reports (id, sound_id, reporter_id, reason) VALUES (?, ?, ?, ?)
      ON CONFLICT(sound_id, reporter_id) DO UPDATE SET reason = excluded.reason, status = 'open', created_at = CURRENT_TIMESTAMP`)
      .bind(id, soundId, user.id, reason),
    env.DB.prepare("UPDATE sounds SET report_count = (SELECT COUNT(*) FROM reports WHERE sound_id = ? AND status = 'open') WHERE id = ?")
      .bind(soundId, soundId),
  ])
  return json({ reported: true }, 201)
}

async function streamAudio(request: Request, env: Env, soundId: string) {
  const row = await env.DB.prepare("SELECT object_key, mime_type, sha256 FROM sounds WHERE id = ? AND status = 'approved'").bind(soundId).first<{ object_key: string; mime_type: string; sha256: string }>()
  if (!row) throw new HttpError(404, '音源が見つかりません')
  return streamStoredAudio(request, env, row, 'public, max-age=86400, immutable')
}

async function listAdminSounds(request: Request, env: Env) {
  const url = new URL(request.url)
  const requested = url.searchParams.get('status')
  const status: SoundStatus = requested === 'pending' || requested === 'rejected' || requested === 'hidden' ? requested : 'approved'
  const result = await env.DB.prepare(`
    SELECT s.id, s.title, s.color, s.mime_type, s.size_bytes, s.uploader_id,
      u.display_name AS uploader_name, s.like_count, s.created_at, 0 AS liked, s.status
    FROM sounds s JOIN users u ON u.id = s.uploader_id
    WHERE s.status = ? ORDER BY s.created_at DESC LIMIT 100
  `).bind(status).all<SoundRow>()
  return json({ sounds: result.results.map((row) => ({
    ...publicSound(row, url.origin),
    url: `${url.origin}/api/admin/sounds/${encodeURIComponent(row.id)}/audio`,
    status: row.status,
  })) })
}

async function reviewSound(request: Request, env: Env, soundId: string) {
  const body = await readJson<{ status?: unknown }>(request)
  if (body.status !== 'approved' && body.status !== 'rejected' && body.status !== 'hidden') {
    throw new HttpError(400, 'statusが不正です')
  }
  const existing = await env.DB.prepare('SELECT status, object_key FROM sounds WHERE id = ?').bind(soundId).first<{ status: SoundStatus; object_key: string }>()
  if (!existing) throw new HttpError(404, '音源が見つかりません')
  if (existing.status === 'rejected' && body.status !== 'rejected') throw new HttpError(409, '却下済みの音源は復元できません')
  const reviewer = cleanHeader(request.headers.get('X-Admin-Name'), 80) || 'admin'
  const result = await env.DB.prepare(`
    UPDATE sounds SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?
  `).bind(body.status, reviewer, soundId).run()
  if (!result.meta.changes) throw new HttpError(404, '音源が見つかりません')
  if (body.status === 'rejected') await env.AUDIO.delete(existing.object_key)
  return json({ id: soundId, status: body.status })
}

async function streamAdminAudio(request: Request, env: Env, soundId: string) {
  const row = await env.DB.prepare('SELECT object_key, mime_type, sha256 FROM sounds WHERE id = ?').bind(soundId).first<{ object_key: string; mime_type: string; sha256: string }>()
  if (!row) throw new HttpError(404, '音源が見つかりません')
  return streamStoredAudio(request, env, row, 'private, no-store')
}

async function streamStoredAudio(
  request: Request,
  env: Env,
  row: { object_key: string; mime_type: string; sha256: string },
  cacheControl: string,
) {
  const stored = await env.AUDIO.getWithMetadata<AudioMetadata>(row.object_key, { type: 'arrayBuffer' })
  if (!stored.value) throw new HttpError(404, '音声ファイルが見つかりません')
  const total = stored.value.byteLength
  const range = parseByteRange(request.headers.get('Range'), total)
  const body = range ? stored.value.slice(range.start, range.end + 1) : stored.value
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Cache-Control': cacheControl,
    'Content-Length': String(body.byteLength),
    'Content-Type': stored.metadata?.contentType || row.mime_type,
    'ETag': `"${row.sha256}"`,
  })
  if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${total}`)
  return new Response(body, { status: range ? 206 : 200, headers })
}

function parseByteRange(value: string | null, total: number) {
  if (!value) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim())
  if (!match) return null
  const [, startText, endText] = match
  if (!startText && !endText) return null
  let start = startText ? Number(startText) : Math.max(0, total - Number(endText))
  let end = endText && startText ? Number(endText) : total - 1
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= total || end < start) return null
  end = Math.min(end, total - 1)
  return { start, end }
}

function publicSound(row: SoundRow, apiOrigin: string) {
  return {
    id: row.id,
    label: row.title,
    color: row.color,
    icon: 'custom' as const,
    source: 'community' as const,
    url: `${apiOrigin}/api/sounds/${encodeURIComponent(row.id)}/audio`,
    author: row.uploader_name,
    likeCount: row.like_count,
    liked: Boolean(row.liked),
    createdAt: row.created_at,
  }
}

function requireUser(request: Request) {
  const id = cleanHeader(request.headers.get('X-Gravity-User-Id'), 128)
  const name = cleanHeader(request.headers.get('X-Gravity-User-Name'), 80)
  const avatar = cleanHeader(request.headers.get('X-Gravity-User-Avatar'), 500)
  if (!id || !name) throw new HttpError(401, 'GRAVITYのユーザー情報を取得できません')
  return { id, name, avatar }
}

async function upsertUser(env: Env, user: ReturnType<typeof requireUser>) {
  await env.DB.prepare(`
    INSERT INTO users (id, display_name, avatar_url) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, avatar_url = excluded.avatar_url, updated_at = CURRENT_TIMESTAMP
  `).bind(user.id, user.name, user.avatar || null).run()
}

function requireAdmin(request: Request, env: Env) {
  if (!env.ADMIN_TOKEN) throw new HttpError(503, '管理トークンが設定されていません')
  if (request.headers.get('Authorization') !== `Bearer ${env.ADMIN_TOKEN}`) throw new HttpError(401, '管理者認証が必要です')
}

function requireAllowedWriteOrigin(request: Request, env: Env) {
  const origin = request.headers.get('Origin')
  if (origin && !allowedOrigins(env).has(origin)) throw new HttpError(403, '許可されていない接続元です')
}

function corsHeaders(origin: string | null, env: Env) {
  const headers = new Headers({
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Admin-Name, X-Gravity-User-Avatar, X-Gravity-User-Id, X-Gravity-User-Name',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  })
  if (origin && allowedOrigins(env).has(origin)) headers.set('Access-Control-Allow-Origin', origin)
  return headers
}

function allowedOrigins(env: Env) {
  return new Set((env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean))
}

function detectAudioType(bytes: Uint8Array) {
  if (bytes.length >= 12 && textAt(bytes, 0, 4) === 'RIFF' && textAt(bytes, 8, 4) === 'WAVE') return 'audio/wav'
  if (bytes.length >= 3 && textAt(bytes, 0, 3) === 'ID3') return 'audio/mpeg'
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'audio/mpeg'
  if (bytes.length >= 12 && textAt(bytes, 4, 4) === 'ftyp') return 'audio/mp4'
  return null
}

function textAt(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length))
}

async function sha256(data: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

function colorForId(id: string): SoundColor {
  return COLORS[Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % COLORS.length]
}

function cleanText(value: FormDataEntryValue | unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength) : ''
}

function cleanHeader(value: string | null, maxLength: number) {
  if (!value) return ''
  let decoded = value
  try { decoded = decodeURIComponent(value) } catch { /* accept unencoded ASCII clients */ }
  return decoded.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength)
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json<T>()
  } catch {
    throw new HttpError(400, 'JSONが不正です')
  }
}

function json(data: unknown, status = 200, extraHeaders?: Headers) {
  const headers = new Headers(extraHeaders)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('X-Content-Type-Options', 'nosniff')
  return new Response(JSON.stringify(data), { status, headers })
}
