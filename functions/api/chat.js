// Cloudflare Pages Function: /api/chat
// - Proxies chat requests to DashScope (OpenAI-compatible)
// - Enforces anonymous daily quota (default: 5/day)
// - Streams response as SSE: text chunks + meta/done events

const DAILY_LIMIT = 5
const UID_COOKIE = 'lf_uid'

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  })
}

function base64UrlEncode(bytes) {
  let binary = ''
  const arr = new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecodeToBytes(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function timingSafeEqualBytes(a, b) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i]
  return out === 0
}

async function hmacSha256Base64Url(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  return base64UrlEncode(sig)
}

function parseCookies(cookieHeader) {
  const out = {}
  if (!cookieHeader) return out
  const parts = cookieHeader.split(';')
  for (const p of parts) {
    const idx = p.indexOf('=')
    if (idx === -1) continue
    const k = p.slice(0, idx).trim()
    const v = p.slice(idx + 1).trim()
    out[k] = v
  }
  return out
}

function randomId() {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  return base64UrlEncode(buf)
}

// Use China timezone (UTC+8) for "daily" unless you change it.
function dayKeyCN() {
  const now = new Date(Date.now() + 8 * 3600 * 1000)
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function buildSystemPrompt() {
  return [
    '你是“占卜结果解读与行动建议助手”，用中文回答。',
    '你只能基于我提供的【页面类型 pageType】、【用户问题 question】与【占卜结果数据 resultData】进行解读；不得虚构牌面/卦象/签文/点数等未提供的信息。',
    '输出要帮助用户“看懂含义 + 给出可执行建议”，避免绝对化断言；强调“结果仅供参考，决定在用户”。',
    '禁止提供医疗/法律/金融投资等确定性结论；如用户问到，给出一般性建议并建议咨询专业人士。',
    '结构固定：',
    '1）一句话结论（不超过25字）',
    '2）解读要点（3-5条，紧扣 resultData）',
    '3）行动建议（3条，可执行）',
    '4）提醒（1-2条：边界/风险/心态）',
    '5）反问引导（给用户2个可继续追问的问题）',
  ].join('\n')
}

function buildContextPrompt({ pageType, question, resultData, mode }) {
  const q = (question || '').trim() || '（未填写）'
  return [
    `【pageType】= ${pageType}`,
    `【用户最初问题】= ${q}`,
    `【mode】= ${mode}`,
    `【resultData JSON】= ${JSON.stringify(resultData ?? null)}`,
    '你要把 resultData 当作唯一事实来源。',
    '若 resultData 缺失/为空：先提示用户先完成占卜再解读，并引导如何提问。',
  ].join('\n')
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return []
  // Only accept {role:'user'|'assistant', content:string}
  const out = []
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue
    if (m.role !== 'user' && m.role !== 'assistant') continue
    const content = typeof m.content === 'string' ? m.content : ''
    if (!content.trim()) continue
    out.push({ role: m.role, content: content.slice(0, 6000) })
  }
  // Keep last 10 messages to control cost
  return out.slice(-10)
}

async function getOrSetUid({ request, secret }) {
  const cookies = parseCookies(request.headers.get('cookie') || '')
  const raw = cookies[UID_COOKIE]
  if (raw) {
    const [uid, sig] = raw.split('.')
    if (uid && sig) {
      const expected = await hmacSha256Base64Url(secret, uid)
      const ok = timingSafeEqualBytes(
        base64UrlDecodeToBytes(sig),
        base64UrlDecodeToBytes(expected)
      )
      if (ok) return { uid, setCookie: null }
    }
  }

  const uid = randomId()
  const sig = await hmacSha256Base64Url(secret, uid)
  const cookie = `${UID_COOKIE}=${uid}.${sig}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
  return { uid, setCookie: cookie }
}

async function incrementQuota({ env, uid, day }) {
  // Prefer D1 if bound as env.DB
  if (env.DB) {
    // Ensure schema:
    // CREATE TABLE IF NOT EXISTS ai_quota(uid TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(uid, day));
    const now = Date.now()

    const existing = await env.DB
      .prepare('SELECT count FROM ai_quota WHERE uid = ?1 AND day = ?2')
      .bind(uid, day)
      .first()

    const cur = Number(existing?.count || 0)
    if (cur >= DAILY_LIMIT) {
      return { used: cur, remaining: 0, limit: DAILY_LIMIT, exceeded: true }
    }

    if (!existing) {
      await env.DB
        .prepare('INSERT INTO ai_quota (uid, day, count, updated_at) VALUES (?1, ?2, 1, ?3)')
        .bind(uid, day, now)
        .run()
      return { used: 1, remaining: DAILY_LIMIT - 1, limit: DAILY_LIMIT }
    }

    const row = await env.DB
      .prepare(
        `UPDATE ai_quota
         SET count = count + 1, updated_at = ?3
         WHERE uid = ?1 AND day = ?2
         RETURNING count;`
      )
      .bind(uid, day, now)
      .first()

    const used = Number(row?.count || cur + 1)
    return { used, remaining: Math.max(0, DAILY_LIMIT - used), limit: DAILY_LIMIT }
  }

  // Fallback KV if bound as env.AI_KV
  if (env.AI_KV) {
    const key = `quota:${uid}:${day}`
    const curStr = await env.AI_KV.get(key)
    const cur = curStr ? Number(curStr) : 0
    if (cur >= DAILY_LIMIT) {
      return { used: cur, remaining: 0, limit: DAILY_LIMIT, exceeded: true }
    }
    const used = cur + 1
    // TTL ~ 2 days to be safe
    await env.AI_KV.put(key, String(used), { expirationTtl: 60 * 60 * 24 * 2 })
    return { used, remaining: Math.max(0, DAILY_LIMIT - used), limit: DAILY_LIMIT }
  }

  throw new Error('Missing quota storage binding. Bind D1 as DB or KV as AI_KV.')
}

function sseWrite(writer, { event, data }) {
  let out = ''
  if (event) out += `event: ${event}\n`
  const payload = typeof data === 'string' ? data : JSON.stringify(data)

  // SSE allows multiple data: lines; split to preserve newlines.
  const lines = payload.split(/\n/)
  for (const line of lines) out += `data: ${line}\n`
  out += '\n'
  return writer.write(new TextEncoder().encode(out))
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  })
}

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const cookieSecret = env.COOKIE_SIGNING_SECRET
    if (!cookieSecret) {
      return json({ error: 'Missing COOKIE_SIGNING_SECRET' }, { status: 500 })
    }

    const { uid, setCookie } = await getOrSetUid({ request, secret: cookieSecret })
    const day = dayKeyCN()

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const pageType = String(body.pageType || '')
    const question = typeof body.question === 'string' ? body.question : ''
    const resultData = body.resultData
    const mode = body.mode === 'interpretation' ? 'interpretation' : 'chat'
    const clientMessages = sanitizeMessages(body.messages)

    // Quota check
    const quota = await incrementQuota({ env, uid, day })
    if (quota.exceeded) {
      return json(
        {
          error: 'DAILY_LIMIT_EXCEEDED',
          message: `今日免费对话次数已用完（${DAILY_LIMIT}次/天）。`,
          remaining: 0,
          limit: DAILY_LIMIT,
          day,
        },
        {
          status: 429,
          headers: setCookie ? { 'set-cookie': setCookie } : undefined,
        }
      )
    }

    const apiKey = env.DASHSCOPE_API_KEY || env.api_key
    const baseUrl = env.DASHSCOPE_BASE_URL || env.base_url
    if (!apiKey || !baseUrl) {
      return json(
        { error: 'Missing DASHSCOPE_API_KEY/api_key or DASHSCOPE_BASE_URL/base_url' },
        { status: 500, headers: setCookie ? { 'set-cookie': setCookie } : undefined }
      )
    }

    const systemPrompt = buildSystemPrompt()
    const ctxPrompt = buildContextPrompt({ pageType, question, resultData, mode })

    const messages = [
      { role: 'system', content: systemPrompt + '\n\n' + ctxPrompt },
      ...clientMessages,
    ]

    // If interpretation mode and user provided no message, push a default user ask.
    if (mode === 'interpretation') {
      const hasUser = messages.some(m => m.role === 'user')
      if (!hasUser) {
        messages.push({ role: 'user', content: '请对以上占卜结果进行一次深度解读。' })
      }
    }

    const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        stream: true,
        temperature: 0.7,
        messages,
      }),
    })

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '')
      return json(
        { error: 'UPSTREAM_ERROR', status: upstream.status, detail: text.slice(0, 800) },
        { status: 502, headers: setCookie ? { 'set-cookie': setCookie } : undefined }
      )
    }

    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    // Fire meta event first
    await sseWrite(writer, {
      event: 'meta',
      data: { remaining: quota.remaining, limit: quota.limit, day },
    })

    // Parse OpenAI-style SSE from upstream and forward as text chunks.
    const reader = upstream.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buf = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      // Process complete SSE events separated by \n\n
      let idx
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const rawEvent = buf.slice(0, idx)
        buf = buf.slice(idx + 2)

        const lines = rawEvent.split('\n')
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const dataStr = t.slice(5).trim()
          if (!dataStr) continue
          if (dataStr === '[DONE]') {
            await sseWrite(writer, { event: 'done', data: { remaining: quota.remaining, limit: quota.limit, day } })
            await writer.close()
            return new Response(readable, {
              headers: {
                'content-type': 'text/event-stream; charset=utf-8',
                'cache-control': 'no-cache',
                ...(setCookie ? { 'set-cookie': setCookie } : {}),
              },
            })
          }

          let parsed
          try {
            parsed = JSON.parse(dataStr)
          } catch {
            continue
          }

          const delta = parsed?.choices?.[0]?.delta?.content
          const full = parsed?.choices?.[0]?.message?.content
          const piece = typeof delta === 'string' ? delta : typeof full === 'string' ? full : ''
          if (piece) {
            await sseWrite(writer, { event: null, data: piece })
          }
        }
      }
    }

    await sseWrite(writer, { event: 'done', data: { remaining: quota.remaining, limit: quota.limit, day } })
    await writer.close()

    return new Response(readable, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        ...(setCookie ? { 'set-cookie': setCookie } : {}),
      },
    })
  } catch (err) {
    return json({ error: 'INTERNAL_ERROR', message: String(err?.message || err) }, { status: 500 })
  }
}
