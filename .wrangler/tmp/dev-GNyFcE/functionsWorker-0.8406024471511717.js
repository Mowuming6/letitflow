var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-DFMViY/functionsWorker-0.8406024471511717.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var DAILY_LIMIT = 5;
var UID_COOKIE = "lf_uid";
function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers || {}
    }
  });
}
__name(json, "json");
__name2(json, "json");
function base64UrlEncode(bytes) {
  let binary = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlEncode, "base64UrlEncode");
__name2(base64UrlEncode, "base64UrlEncode");
function base64UrlDecodeToBytes(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - str.length % 4);
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(base64UrlDecodeToBytes, "base64UrlDecodeToBytes");
__name2(base64UrlDecodeToBytes, "base64UrlDecodeToBytes");
function timingSafeEqualBytes(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}
__name(timingSafeEqualBytes, "timingSafeEqualBytes");
__name2(timingSafeEqualBytes, "timingSafeEqualBytes");
async function hmacSha256Base64Url(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return base64UrlEncode(sig);
}
__name(hmacSha256Base64Url, "hmacSha256Base64Url");
__name2(hmacSha256Base64Url, "hmacSha256Base64Url");
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}
__name(parseCookies, "parseCookies");
__name2(parseCookies, "parseCookies");
function randomId() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
}
__name(randomId, "randomId");
__name2(randomId, "randomId");
function dayKeyCN() {
  const now = new Date(Date.now() + 8 * 3600 * 1e3);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
__name(dayKeyCN, "dayKeyCN");
__name2(dayKeyCN, "dayKeyCN");
function buildSystemPrompt() {
  return [
    "\u4F60\u662F\u201C\u5360\u535C\u7ED3\u679C\u89E3\u8BFB\u4E0E\u884C\u52A8\u5EFA\u8BAE\u52A9\u624B\u201D\uFF0C\u7528\u4E2D\u6587\u56DE\u7B54\u3002",
    "\u4F60\u53EA\u80FD\u57FA\u4E8E\u6211\u63D0\u4F9B\u7684\u3010\u9875\u9762\u7C7B\u578B pageType\u3011\u3001\u3010\u7528\u6237\u95EE\u9898 question\u3011\u4E0E\u3010\u5360\u535C\u7ED3\u679C\u6570\u636E resultData\u3011\u8FDB\u884C\u89E3\u8BFB\uFF1B\u4E0D\u5F97\u865A\u6784\u724C\u9762/\u5366\u8C61/\u7B7E\u6587/\u70B9\u6570\u7B49\u672A\u63D0\u4F9B\u7684\u4FE1\u606F\u3002",
    "\u8F93\u51FA\u8981\u5E2E\u52A9\u7528\u6237\u201C\u770B\u61C2\u542B\u4E49 + \u7ED9\u51FA\u53EF\u6267\u884C\u5EFA\u8BAE\u201D\uFF0C\u907F\u514D\u7EDD\u5BF9\u5316\u65AD\u8A00\uFF1B\u5F3A\u8C03\u201C\u7ED3\u679C\u4EC5\u4F9B\u53C2\u8003\uFF0C\u51B3\u5B9A\u5728\u7528\u6237\u201D\u3002",
    "\u7981\u6B62\u63D0\u4F9B\u533B\u7597/\u6CD5\u5F8B/\u91D1\u878D\u6295\u8D44\u7B49\u786E\u5B9A\u6027\u7ED3\u8BBA\uFF1B\u5982\u7528\u6237\u95EE\u5230\uFF0C\u7ED9\u51FA\u4E00\u822C\u6027\u5EFA\u8BAE\u5E76\u5EFA\u8BAE\u54A8\u8BE2\u4E13\u4E1A\u4EBA\u58EB\u3002",
    "\u7ED3\u6784\u56FA\u5B9A\uFF1A",
    "1\uFF09\u4E00\u53E5\u8BDD\u7ED3\u8BBA\uFF08\u4E0D\u8D85\u8FC725\u5B57\uFF09",
    "2\uFF09\u89E3\u8BFB\u8981\u70B9\uFF083-5\u6761\uFF0C\u7D27\u6263 resultData\uFF09",
    "3\uFF09\u884C\u52A8\u5EFA\u8BAE\uFF083\u6761\uFF0C\u53EF\u6267\u884C\uFF09",
    "4\uFF09\u63D0\u9192\uFF081-2\u6761\uFF1A\u8FB9\u754C/\u98CE\u9669/\u5FC3\u6001\uFF09",
    "5\uFF09\u53CD\u95EE\u5F15\u5BFC\uFF08\u7ED9\u7528\u62372\u4E2A\u53EF\u7EE7\u7EED\u8FFD\u95EE\u7684\u95EE\u9898\uFF09"
  ].join("\n");
}
__name(buildSystemPrompt, "buildSystemPrompt");
__name2(buildSystemPrompt, "buildSystemPrompt");
function buildContextPrompt({ pageType, question, resultData, mode }) {
  const q = (question || "").trim() || "\uFF08\u672A\u586B\u5199\uFF09";
  return [
    `\u3010pageType\u3011= ${pageType}`,
    `\u3010\u7528\u6237\u6700\u521D\u95EE\u9898\u3011= ${q}`,
    `\u3010mode\u3011= ${mode}`,
    `\u3010resultData JSON\u3011= ${JSON.stringify(resultData ?? null)}`,
    "\u4F60\u8981\u628A resultData \u5F53\u4F5C\u552F\u4E00\u4E8B\u5B9E\u6765\u6E90\u3002",
    "\u82E5 resultData \u7F3A\u5931/\u4E3A\u7A7A\uFF1A\u5148\u63D0\u793A\u7528\u6237\u5148\u5B8C\u6210\u5360\u535C\u518D\u89E3\u8BFB\uFF0C\u5E76\u5F15\u5BFC\u5982\u4F55\u63D0\u95EE\u3002"
  ].join("\n");
}
__name(buildContextPrompt, "buildContextPrompt");
__name2(buildContextPrompt, "buildContextPrompt");
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    if (m.role !== "user" && m.role !== "assistant") continue;
    const content = typeof m.content === "string" ? m.content : "";
    if (!content.trim()) continue;
    out.push({ role: m.role, content: content.slice(0, 6e3) });
  }
  return out.slice(-10);
}
__name(sanitizeMessages, "sanitizeMessages");
__name2(sanitizeMessages, "sanitizeMessages");
async function getOrSetUid({ request, secret }) {
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const raw = cookies[UID_COOKIE];
  if (raw) {
    const [uid2, sig2] = raw.split(".");
    if (uid2 && sig2) {
      const expected = await hmacSha256Base64Url(secret, uid2);
      const ok = timingSafeEqualBytes(
        base64UrlDecodeToBytes(sig2),
        base64UrlDecodeToBytes(expected)
      );
      if (ok) return { uid: uid2, setCookie: null };
    }
  }
  const uid = randomId();
  const sig = await hmacSha256Base64Url(secret, uid);
  const cookie = `${UID_COOKIE}=${uid}.${sig}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`;
  return { uid, setCookie: cookie };
}
__name(getOrSetUid, "getOrSetUid");
__name2(getOrSetUid, "getOrSetUid");
async function incrementQuota({ env, uid, day }) {
  if (env.DB) {
    const now = Date.now();
    const existing = await env.DB.prepare("SELECT count FROM ai_quota WHERE uid = ?1 AND day = ?2").bind(uid, day).first();
    const cur = Number(existing?.count || 0);
    if (cur >= DAILY_LIMIT) {
      return { used: cur, remaining: 0, limit: DAILY_LIMIT, exceeded: true };
    }
    if (!existing) {
      await env.DB.prepare("INSERT INTO ai_quota (uid, day, count, updated_at) VALUES (?1, ?2, 1, ?3)").bind(uid, day, now).run();
      return { used: 1, remaining: DAILY_LIMIT - 1, limit: DAILY_LIMIT };
    }
    const row = await env.DB.prepare(
      `UPDATE ai_quota
         SET count = count + 1, updated_at = ?3
         WHERE uid = ?1 AND day = ?2
         RETURNING count;`
    ).bind(uid, day, now).first();
    const used = Number(row?.count || cur + 1);
    return { used, remaining: Math.max(0, DAILY_LIMIT - used), limit: DAILY_LIMIT };
  }
  if (env.AI_KV) {
    const key = `quota:${uid}:${day}`;
    const curStr = await env.AI_KV.get(key);
    const cur = curStr ? Number(curStr) : 0;
    if (cur >= DAILY_LIMIT) {
      return { used: cur, remaining: 0, limit: DAILY_LIMIT, exceeded: true };
    }
    const used = cur + 1;
    await env.AI_KV.put(key, String(used), { expirationTtl: 60 * 60 * 24 * 2 });
    return { used, remaining: Math.max(0, DAILY_LIMIT - used), limit: DAILY_LIMIT };
  }
  throw new Error("Missing quota storage binding. Bind D1 as DB or KV as AI_KV.");
}
__name(incrementQuota, "incrementQuota");
__name2(incrementQuota, "incrementQuota");
function sseWrite(writer, { event, data }) {
  let out = "";
  if (event) out += `event: ${event}
`;
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  const lines = payload.split(/\n/);
  for (const line of lines) out += `data: ${line}
`;
  out += "\n";
  return writer.write(new TextEncoder().encode(out));
}
__name(sseWrite, "sseWrite");
__name2(sseWrite, "sseWrite");
async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
__name(onRequestOptions, "onRequestOptions");
__name2(onRequestOptions, "onRequestOptions");
async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const cookieSecret = env.COOKIE_SIGNING_SECRET;
    if (!cookieSecret) {
      return json({ error: "Missing COOKIE_SIGNING_SECRET" }, { status: 500 });
    }
    const { uid, setCookie } = await getOrSetUid({ request, secret: cookieSecret });
    const day = dayKeyCN();
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const pageType = String(body.pageType || "");
    const question = typeof body.question === "string" ? body.question : "";
    const resultData = body.resultData;
    const mode = body.mode === "interpretation" ? "interpretation" : "chat";
    const clientMessages = sanitizeMessages(body.messages);
    const quota = await incrementQuota({ env, uid, day });
    if (quota.exceeded) {
      return json(
        {
          error: "DAILY_LIMIT_EXCEEDED",
          message: `\u4ECA\u65E5\u514D\u8D39\u5BF9\u8BDD\u6B21\u6570\u5DF2\u7528\u5B8C\uFF08${DAILY_LIMIT}\u6B21/\u5929\uFF09\u3002`,
          remaining: 0,
          limit: DAILY_LIMIT,
          day
        },
        {
          status: 429,
          headers: setCookie ? { "set-cookie": setCookie } : void 0
        }
      );
    }
    const apiKey = env.DASHSCOPE_API_KEY || env.api_key;
    const baseUrl = env.DASHSCOPE_BASE_URL || env.base_url;
    if (!apiKey || !baseUrl) {
      return json(
        { error: "Missing DASHSCOPE_API_KEY/api_key or DASHSCOPE_BASE_URL/base_url" },
        { status: 500, headers: setCookie ? { "set-cookie": setCookie } : void 0 }
      );
    }
    const systemPrompt = buildSystemPrompt();
    const ctxPrompt = buildContextPrompt({ pageType, question, resultData, mode });
    const messages = [
      { role: "system", content: systemPrompt + "\n\n" + ctxPrompt },
      ...clientMessages
    ];
    if (mode === "interpretation") {
      const hasUser = messages.some((m) => m.role === "user");
      if (!hasUser) {
        messages.push({ role: "user", content: "\u8BF7\u5BF9\u4EE5\u4E0A\u5360\u535C\u7ED3\u679C\u8FDB\u884C\u4E00\u6B21\u6DF1\u5EA6\u89E3\u8BFB\u3002" });
      }
    }
    const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "qwen-plus",
        stream: true,
        temperature: 0.7,
        messages
      })
    });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return json(
        { error: "UPSTREAM_ERROR", status: upstream.status, detail: text.slice(0, 800) },
        { status: 502, headers: setCookie ? { "set-cookie": setCookie } : void 0 }
      );
    }
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    await sseWrite(writer, {
      event: "meta",
      data: { remaining: quota.remaining, limit: quota.limit, day }
    });
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const rawEvent = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const lines = rawEvent.split("\n");
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const dataStr = t.slice(5).trim();
          if (!dataStr) continue;
          if (dataStr === "[DONE]") {
            await sseWrite(writer, { event: "done", data: { remaining: quota.remaining, limit: quota.limit, day } });
            await writer.close();
            return new Response(readable, {
              headers: {
                "content-type": "text/event-stream; charset=utf-8",
                "cache-control": "no-cache",
                ...setCookie ? { "set-cookie": setCookie } : {}
              }
            });
          }
          let parsed;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            continue;
          }
          const delta = parsed?.choices?.[0]?.delta?.content;
          const full = parsed?.choices?.[0]?.message?.content;
          const piece = typeof delta === "string" ? delta : typeof full === "string" ? full : "";
          if (piece) {
            await sseWrite(writer, { event: null, data: piece });
          }
        }
      }
    }
    await sseWrite(writer, { event: "done", data: { remaining: quota.remaining, limit: quota.limit, day } });
    await writer.close();
    return new Response(readable, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        ...setCookie ? { "set-cookie": setCookie } : {}
      }
    });
  } catch (err) {
    return json({ error: "INTERNAL_ERROR", message: String(err?.message || err) }, { status: 500 });
  }
}
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
var routes = [
  {
    routePath: "/api/chat",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/chat",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-p0pK0G/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-p0pK0G/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.8406024471511717.js.map
