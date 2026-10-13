import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { Readable } from 'node:stream'

/**
 * Serves /api/chat from api/chat.js during `vite dev`, the same handler
 * Vercel runs in production — so the Groq key stays server-side locally too.
 */
const apiChat = (): Plugin => ({
  name: 'api-chat',
  configureServer(server) {
    server.middlewares.use('/api/chat', async (req, res) => {
      try {
        const mod = await server.ssrLoadModule('/api/chat.js')
        const handler = mod[req.method ?? 'GET']
        if (!handler) { res.statusCode = 405; res.end(); return }

        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const abort = new AbortController()
        res.on('close', () => abort.abort())

        const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
          method: req.method,
          headers: { ...req.headers as Record<string, string>, 'x-forwarded-for': req.socket.remoteAddress ?? 'local' },
          body: chunks.length ? Buffer.concat(chunks) : undefined,
          signal: abort.signal,
        })
        const response: Response = await handler(request)
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        if (response.body) Readable.fromWeb(response.body as never).pipe(res)
        else res.end()
      } catch (err) {
        server.config.logger.error(`[api/chat] ${err}`)
        if (!res.headersSent) res.statusCode = 500
        res.end()
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Make .env values (GROQ_API_KEY etc.) visible to the dev API handler
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), tailwindcss(), apiChat()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            gsap: ['gsap', '@gsap/react'],
            markdown: ['react-markdown', 'remark-gfm'],
          },
        },
      },
    },
  }
})
