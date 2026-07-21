const PROVIDERS = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    keyEnv: 'DEEPSEEK_KEY',
    models: ['deepseek-v4-flash']
  },
  ustc: {
    baseUrl: 'https://api.llm.ustc.edu.cn',
    keyEnv: 'USTC_KEY',
    models: ['deepseek-v4-pro', 'deepseek-v4-flash-ascend', 'qwen3.6-chat', 'qwen3.6-reasoner']
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(request.url)
    if (url.pathname !== '/api/chat') {
      return new Response(JSON.stringify({ error: '路径错误，请使用 POST /api/chat' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: '请求体必须是 JSON' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { provider, model, messages } = body
    if (!provider || !model || !messages) {
      return new Response(JSON.stringify({ error: '缺少必填字段: provider, model, messages' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const providerConfig = PROVIDERS[provider]
    if (!providerConfig) {
      return new Response(JSON.stringify({ error: `不支持的 provider: ${provider}，可用: ${Object.keys(PROVIDERS).join(', ')}` }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!providerConfig.models.includes(model)) {
      return new Response(JSON.stringify({ error: `provider "${provider}" 不支持模型 "${model}"，可用: ${providerConfig.models.join(', ')}` }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = env[providerConfig.keyEnv]
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `服务端未配置 ${providerConfig.keyEnv} 环境变量` }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const payload = {
      model,
      messages,
      stream: false,
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)

      const resp = await fetch(`${providerConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const text = await resp.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        return new Response(JSON.stringify({
          error: `上游 API 返回非 JSON 响应 (${resp.status})`,
          detail: text.slice(0, 500),
        }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      if (!resp.ok) {
        return new Response(JSON.stringify({
          error: `上游 API 返回错误 (${resp.status})`,
          detail: data,
        }), {
          status: resp.status,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: `请求上游 API 失败: ${err.name === 'AbortError' ? '连接超时 (15s)' : err.message}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
  }
}