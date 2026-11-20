// SVG rendering and visual effects.
const qs = document.querySelector.bind(document)
const createSvgEl = tag => document.createElementNS('http://www.w3.org/2000/svg', tag)
export const field = qs('#field')
const STAR_COUNT = 50
const STAR_TRAVEL = 1100
const WARP_SPEED_BOOST = 10
const stars = []
const warpGlow = qs('#warpGlowLayer')
const rangedRandom = (min, max) => Math.random() * (max - min) + min
const rangedRandomInt = (min, max) => Math.floor(rangedRandom(min, max))
const shapes = {
    RM: { color: '#fe2712', path: 'h21v-15h18v15h21z' },
    TM: { color: '#fb9902', path: 'h16l14-15 14 15h16z' },
    CM: { color: '#fefe33', path: 'h16a14 14 0 0 1 28 0h16z' },
    CF: { color: '#8601af', path: 'h16a14 14 0 0 0 28 0h16z' },
    TF: { color: '#0247fe', path: 'h16l14 15 14-15h16z' },
    RF: { color: '#66b032', path: 'h21v15h18v-15h21z' },
}

function resetStar(star, depth) {
    const angle = rangedRandom(0, 2 * Math.PI)
    star.x = Math.cos(angle)
    star.y = Math.sin(angle)
    star.depth = depth
    // Keep the original cruise pace when mapping the old depth range to 0–1.
    const maxDepth = Math.sqrt(STAR_TRAVEL / rangedRandom(100, 250))
    star.speed = 0.5 * rangedRandom(0.3, 1.2) / maxDepth
}

function initializeStars() {
    const starsEl = qs('#stars')
    for (let i = 0; i < STAR_COUNT; i++) {
        const star = { line: createSvgEl('line') }
        resetStar(star, Math.random())
        starsEl.appendChild(star.line)
        stars.push(star)
    }
}

export function animateStars(delta, warpProgress = 0) {
    // Speed and trail length ease in and out together without resetting the stars.
    const intensity = Math.sin(Math.PI * warpProgress) ** 2
    const boost = WARP_SPEED_BOOST * intensity
    warpGlow.setAttribute('opacity', intensity)

    for (const star of stars) {
        star.depth += delta * star.speed * (1 + boost)
        if (star.depth >= 1) resetStar(star, star.depth % 1)

        const { line, x, y, depth, speed } = star
        const head = STAR_TRAVEL * depth ** 2
        const extraSpeed = 2 * STAR_TRAVEL * depth * speed * boost
        const tail = Math.max(0, head - 0.01 - extraSpeed * 0.2)
        const opacity = Math.min(1, depth / 0.15, (1 - depth) / 0.12)
        line.setAttribute('opacity', opacity)
        line.setAttribute('stroke-width', 1 + 5 * depth)
        line.setAttribute('x1', x * tail)
        line.setAttribute('y1', y * tail)
        line.setAttribute('x2', x * head)
        line.setAttribute('y2', y * head)
    }
}

export function initializeView() {
    initializeStars()
    const cardEl = qs('#newGameCard')

    let el = createSvgEl('path')
    el.setAttribute('fill', shapes.TM.color)
    el.setAttribute('d', `M30 0a30 30 0 0 1-60 0${shapes.TM.path}`)
    el.setAttribute('transform', 'translate(-180 -120) rotate(90) scale(2)')
    cardEl.appendChild(el)

    el = createSvgEl('path')
    el.setAttribute('fill', shapes.TF.color)
    el.setAttribute('d', `M30 0a30 30 0 0 1-60 0${shapes.TF.path}`)
    el.setAttribute('transform', 'translate(-50 -120) rotate(-90) scale(2)')
    cardEl.appendChild(el)

    el = createSvgEl('path')
    el.setAttribute('stroke', 'white')
    el.setAttribute('stroke-width', '5')
    el.setAttribute('d', 'M-120-120h30m-15-15v30M50-126h30m-30 12h30')
    cardEl.appendChild(el)

    el = createSvgEl('text')
    el.setAttribute('x', '180')
    el.setAttribute('y', '-85')
    el.setAttribute('stroke', 'deepskyblue')
    el.setAttribute('stroke-width', '2')
    el.setAttribute('font-size', '4em')
    el.setAttribute('font-weight', '900')
    el.innerHTML = '10'
    cardEl.appendChild(el)
}

function shapeTargetRender(shapeId, t) {
    const shapeObj = shapes[shapeId]
    const targetEl = qs('#target')
    if (targetEl.getAttribute('data-id') !== shapeId) {
        targetEl.setAttribute('data-id', shapeId)
        targetEl.setAttribute('fill', shapeObj.color)
        targetEl.setAttribute('stroke', shapeObj.color)
        targetEl.innerHTML = ''
        for (let i = 0; i < 4; i++) {
            let pathEl = createSvgEl('path')
            pathEl.setAttribute('d', `M0 0l-30-30${shapeObj.path}`)
            pathEl.setAttribute('transform', `rotate(${i * 90})`)
            targetEl.appendChild(pathEl)
        }
    }
    targetEl.setAttribute('transform', `scale(${(0.7 + 0.7 * t) ** 2})`)
}

function shapeCannonRender(shapeId, cardinal, isChosen) {
    const shapeObj = shapes[shapeId]
    const cannonEl = qs(`#cannon${cardinal}`)
    cannonEl.innerHTML = ''
    let pathEl = createSvgEl('path')
    pathEl.setAttribute('fill', shapeObj.color)
    pathEl.setAttribute('stroke', shapeObj.color)
    pathEl.setAttribute('d', `M35 20h-70l5-30${shapeObj.path}`)
    pathEl.setAttribute('transform', `rotate(${(cardinal + 1) * 90})`)
    if (isChosen) {
        let zapEl = createSvgEl('g')
        zapEl.id = 'zap'
        zapEl.setAttribute('transform', `rotate(${(cardinal - 1) * 90})`)
        cannonEl.appendChild(zapEl)
    }
    cannonEl.appendChild(pathEl)
}

function digitTargetRender(digit, t) {
    const targetEl = qs('#target')
    if (targetEl.getAttribute('data-id') !== '' + digit) {
        targetEl.setAttribute('data-id', digit)
        targetEl.setAttribute('fill', 'none')
        targetEl.setAttribute('stroke', 'none')
        targetEl.innerHTML = ''
        let rectEl = createSvgEl('rect')
        rectEl.setAttribute('rx', '15')
        rectEl.setAttribute('x', '-20')
        rectEl.setAttribute('y', '-20')
        rectEl.setAttribute('width', '40')
        rectEl.setAttribute('height', '40')
        rectEl.setAttribute('stroke-width', '3')
        rectEl.setAttribute('stroke', '#c40233')
        rectEl.setAttribute('fill', '#000')
        let textEl = createSvgEl('text')
        textEl.setAttribute('y', 8)
        textEl.setAttribute('text-anchor', 'middle')
        textEl.setAttribute('fill', '#00a368')
        textEl.textContent = digit
        if (digit >= 10) textEl.setAttribute('font-size', '0.85em')
        targetEl.appendChild(rectEl)
        targetEl.appendChild(textEl)
    }
    targetEl.setAttribute('transform', `scale(${(1.5 + t) ** 2})`)
}

function digitCannonRender(digit, cardinal, isChosen) {
    const cannonEl = qs(`#cannon${cardinal}`)
    cannonEl.innerHTML = ''
    let pathEl = createSvgEl('path')
    pathEl.setAttribute('fill', '#0088bf')
    pathEl.setAttribute('d', `M35 0h-70l8-48q27 7 54 0l8 48`)
    pathEl.setAttribute('transform', `rotate(${(cardinal + 1) * 90}) translate(0, 25)`)
    let textEl = createSvgEl('text')
    textEl.setAttribute('y', 8)
    textEl.setAttribute('text-anchor', 'middle')
    textEl.setAttribute('fill', '#ffd300')
    textEl.textContent = digit
    if (isChosen) {
        let zapEl = createSvgEl('g')
        zapEl.id = 'zap'
        zapEl.setAttribute('transform', `rotate(${(cardinal - 1) * 90})`)
        cannonEl.appendChild(zapEl)
    }
    cannonEl.appendChild(pathEl)
    cannonEl.appendChild(textEl)
}

export function zapRender() {
    const zapEl = qs('#zap')
    let pathEl = createSvgEl('path')
    const d = `M0 0Q${rangedRandomInt(-20, 20)} ${rangedRandomInt(20, 60)} ${rangedRandomInt(-10, 10)} ${rangedRandomInt(50, 110)}T0 160`
    pathEl.setAttribute('d', d)
    zapEl.appendChild(pathEl)
}

export function ptsRender(pts) {
    const ptsEl = qs('#pts')
    ptsEl.innerHTML = ''
    let textEl = createSvgEl('text')
    textEl.setAttribute('text-anchor', 'middle')
    textEl.innerHTML = `+${pts}`
    ptsEl.appendChild(textEl)
}

export function shipShake(isShake) {
    const x = isShake ? rangedRandomInt(0, 20) : 0
    const y = isShake ? rangedRandomInt(0, 20) : 0
    qs('#ship').setAttribute('transform', `translate(${x} ${y})`)
}

export function renderLives(lives, maxLives) {
    qs('#lives').textContent = '💚'.repeat(lives) + '💔'.repeat(maxLives - lives)
}

export function renderScores(score, highScore) {
    qs('#scoreCurr').textContent = score.toLocaleString()
    qs('#scoreHigh').textContent = highScore.toLocaleString()
}

export function setStartCardVisible(visible) {
    qs('#newGameCard').style.display = visible ? '' : 'none'
}

export function renderStage(total) {
    qs('#ship').classList.toggle('gold', total === 100)
}

export function clearRound() {
    const target = qs('#target')
    target.replaceChildren()
    target.removeAttribute('data-id')
    for (let i = 0; i < 4; i++) {
        qs(`#cannon${i}`).replaceChildren()
    }
}

export function renderChallenge(challenge) {
    const renderCannon = challenge.type === 'shape' ? shapeCannonRender : digitCannonRender
    challenge.cannons.forEach((choice, index) => renderCannon(choice, index, challenge.chosen === index))
    renderTarget(challenge, 0)
}

export function renderTarget(challenge, progress) {
    (challenge.type === 'shape' ? shapeTargetRender : digitTargetRender)(challenge.target, progress)
}
