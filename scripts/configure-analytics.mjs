import { readFile, writeFile } from 'node:fs/promises'

const { POSTHOG_KEY: key, POSTHOG_HOST: host } = process.env
if (key && host && URL.canParse(host) && ['https:', 'http:'].includes(new URL(host).protocol)) {
    const path = 'dist/index.html'
    const page = await readFile(path, 'utf8')
    // Parcel can omit the optional <head> tag. Its game script is always present.
    const index = page.search(/<script\b/i)
    if (index === -1) throw new Error('Missing game script in dist/index.html')
    const config = JSON.stringify({ key, host }).replaceAll('<', '\\u003c')
    const script = `<script>window.__POSTHOG_CONFIG__=${config}</script>`
    await writeFile(path, page.slice(0, index) + script + page.slice(index))
    console.log('PostHog configuration added to dist/index.html')
} else {
    console.warn('PostHog disabled: check POSTHOG_KEY and POSTHOG_HOST for this build environment.')
}
