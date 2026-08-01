// Cloudflare Pages Function：全局共享计数器（KV 持久化）
// 路由：/api/counters
//   GET  /api/counters                -> 打开网页人数 +1，返回 { people, decisions }
//   POST /api/counters?type=decision  -> 占卜决策次数 +1，返回 { people, decisions }
//
// KV 绑定名：COUNTER_KV（在 wrangler.toml 或 Cloudflare 控制台 Functions→KV 中配置）
// 基础数：people=66，decisions=166（KV 为空时自动初始化）

const BASE_PEOPLE = 66
const BASE_DECISIONS = 166

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function options() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return options()

  const kv = env.COUNTER_KV
  if (!kv) {
    return json({ error: 'COUNTER_KV 未绑定，请在 Cloudflare 控制台 Functions→KV 命名空间绑定，或在 wrangler.toml 配置 kv_namespaces' }, 500)
  }

  const url = new URL(request.url)
  const isDecision = request.method === 'POST' || url.searchParams.get('type') === 'decision'

  let people = parseInt(await kv.get('people') || '', 10)
  let decisions = parseInt(await kv.get('decisions') || '', 10)
  if (Number.isNaN(people)) people = BASE_PEOPLE
  if (Number.isNaN(decisions)) decisions = BASE_DECISIONS

  if (isDecision) {
    decisions += 1
    await kv.put('decisions', String(decisions))
  } else {
    people += 1
    await kv.put('people', String(people))
  }

  return json({ people, decisions })
}
