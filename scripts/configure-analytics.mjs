import { readFile, writeFile } from 'node:fs/promises'

const { POSTHOG_KEY: key, POSTHOG_HOST: host } = process.env
if (key && host) {
    const path = 'dist/index.html'
    const page = await readFile(path, 'utf8')
    const config = JSON.stringify({ key, host }).replaceAll('<', '\\u003c')
    const script = `<script>window.__POSTHOG_CONFIG__=${config}</script>`
    await writeFile(path, page.replace(/<head\b[^>]*>/i, head => head + script))
}
