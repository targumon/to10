// import { audNeg } from './audio' // https://base64.guru/converter/encode/audio

const audNeg = new Audio('aud/neg.mp3')

const audPos = [
    new Audio('aud/pos0.mp3'),
    new Audio('aud/pos1.mp3'),
    new Audio('aud/pos2.mp3'),
    new Audio('aud/pos3.mp3')
]

const qs = document.querySelector.bind(document)

let scoreHigh = +localStorage.getItem('highScore')
let score
let lives
let cycleLength
let isHandlingHit = false
let isHandlingMiss = false
const starsAmount = 50
const stars = []
const shapes = [
    {id: 'RM', color: '#fe2712', path: 'h21v-15h18v15h21z'},
    {id: 'TM', color: '#fb9902', path: 'h16l14-15 14 15h16z'},
    {id: 'CM', color: '#fefe33', path: 'h16a14 14 0 0 1 28 0h16z'},
    {id: 'CF', color: '#8601af', path: 'h16a14 14 0 0 0 28 0h16z'},
    {id: 'TF', color: '#0247fe', path: 'h16l14 15 14-15h16z'},
    {id: 'RF', color: '#66b032', path: 'h21v15h18v-15h21z'},
]

const createSvgEl = tag => document.createElementNS('http://www.w3.org/2000/svg', tag)
const rangedRandom = (min, max) => Math.random() * (max - min) + min
const rangedRandomInt = (min, max) => Math.floor(rangedRandom(min, max))

const random4 = n => {
    const set = []
    for (let i = 0; i < n; i++) {
        set.push(i)
    }
    for (let i = n - 1; i > 0; i--) { // Fisher–Yates shuffle
        let j = rangedRandomInt(0, i + 1)
        let t = set[i]
        set[i] = set[j]
        set[j] = t
    }
    return set.slice(0, 4)
}

function getCycleShapes() {
    const shapeIndices = random4(6)
    const chosen = rangedRandomInt(0, 4)
    return {
        type: 'shape',
        chosen,
        cannons: shapeIndices.map(i => shapes[i]),
        target: shapes[5 - shapeIndices[chosen]]
    }
}

function getCycleDigits() {
    const digits = random4(9).map(n => n + 1)
    const chosen = rangedRandomInt(0, 4)
    return {
        type: 'digit',
        chosen,
        cannons: digits,
        target: 10 - digits[chosen]
    }
}

const starInit = () => {
    let r = rangedRandom(100, 250)
    let θ = rangedRandom(0, 2 * Math.PI)
    return {
        x: r * Math.cos(θ),
        y: r * Math.sin(θ),
        z: rangedRandom(0, 4),
        s: rangedRandom(0.3, 1.2)
    }
}

function starsInit(stars) {
    for (let i = 0; i < starsAmount; i++) {
        stars[i] = starInit()
    }
}

function starsUpdate(delta) {
    for (let i = 0; i < starsAmount; i++) {
        stars[i].z += delta * stars[i].s
        if (stars[i].z > 4) {
            stars[i] = starInit()
        }
    }
}

function starsRender(t) {
    const starsEl = qs('#stars')
    for (let i = 0; i < starsAmount; i++) {
        let starId = `star${i}`
        let starEl = qs(`#${starId}`)
        if (!starEl) {
            starEl = createSvgEl('circle')
            starEl.id = starId
            starEl.setAttribute('fill', '#fff')
            starsEl.appendChild(starEl)
        }
        starEl.setAttribute('cx', stars[i].x)
        starEl.setAttribute('cy', stars[i].y)
        starEl.setAttribute('r', 1)
        starEl.style.transform = `scale(${stars[i].z ** 2})`
    }
    // starsEl.style.transform = `rotate(${(t / 50) % 360}deg)`
}

function newGameCardRender() {
    const cardEl = qs('#newGameCard')
    cardEl.style.display = ''

    let el = createSvgEl('path')
    el.setAttribute('fill', shapes[1].color)
    el.setAttribute('d', `M30 0a30 30 0 0 1-60 0${shapes[1].path}`)
    el.setAttribute('transform', 'translate(-180 -120) rotate(90) scale(2)')
    cardEl.appendChild(el)

    el = createSvgEl('path')
    el.setAttribute('fill', shapes[4].color)
    el.setAttribute('d', `M30 0a30 30 0 0 1-60 0${shapes[4].path}`)
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

function shapeTargetRender(shapeObj, t) {
    const targetEl = qs('#target')
    if (targetEl.getAttribute('data-id') !== shapeObj.id) {
        targetEl.setAttribute('data-id', shapeObj.id)
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

function shapeCannonRender(shapeObj, cardinal, isChosen) {
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
        textEl.innerHTML = digit
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
    textEl.innerHTML = digit
    if (isChosen) {
        let zapEl = createSvgEl('g')
        zapEl.id = 'zap'
        zapEl.setAttribute('transform', `rotate(${(cardinal - 1) * 90})`)
        cannonEl.appendChild(zapEl)
    }
    cannonEl.appendChild(pathEl)
    cannonEl.appendChild(textEl)
}

function zapRender() {
    const zapEl = qs('#zap')
    let pathEl = createSvgEl('path')
    d = `M0 0Q${rangedRandomInt(-20, 20)} ${rangedRandomInt(20, 60)} ${rangedRandomInt(-10, 10)} ${rangedRandomInt(50, 110)}T0 160`
    pathEl.setAttribute('d', d)
    zapEl.appendChild(pathEl)
}

function ptsRender(pts) {
    score += pts
    qs('#scoreCurr').innerHTML = Number(score).toLocaleString()
    qs('#target').innerHTML = ''
    qs('#target').setAttribute('data-id', null)
    const ptsEl = qs('#pts')
    ptsEl.innerHTML = ''
    let textEl = createSvgEl('text')
    textEl.setAttribute('text-anchor', 'middle')
    textEl.innerHTML = `+${pts}`
    ptsEl.appendChild(textEl)
}

function shipShake(isShake) {
    const x = isShake ? rangedRandomInt(0, 20) : 0
    const y = isShake ? rangedRandomInt(0, 20) : 0
    qs('#ship').setAttribute('transform', `translate(${x} ${y})`)
}

function livesRender(lives) {
    if (lives < 0) lives = 0
    qs('#lives').innerHTML = '💚'.repeat(lives) + '💔'.repeat(3 - lives)
    // 💚❤️💔🙂💀
}

function handleHit() {
    isHandlingHit = true
    tCycle = 0
    audPlay(cycleData.chosen)
    cycleLength *= 0.99
}

function handleMiss() {
    lives--
    audPlay(-1)
    navigator.vibrate && setTimeout(() => navigator.vibrate([50, 50, 100]), 100)
    if (lives > 0) {
        isHandlingMiss = true
        handleNewCycle()
    } else {
        tCycle = 0
        handleGameOver()
    }
}

function handleGameOver() {
    livesRender(0)
    cycleData = null
    qs('#newGameCard').style.display = ''
    qs('#target').innerHTML = ''
    for (let i = 0; i < 4; i++) {
        qs(`#cannon${i}`).innerHTML = ''
    }
    if (score > scoreHigh) {
        scoreHigh = score
        localStorage.setItem('highScore', score)
        qs('#scoreHigh').innerHTML = Number(score).toLocaleString()
    }
}

function handleGameNew() {
    score = 0
    lives = 3
    cycleLength = 10
    qs('#scoreCurr').innerHTML = Number(score).toLocaleString()
    qs('#newGameCard').style.display = 'none'
    handleNewCycle()
}

function handleNewCycle() {
    tCycle = 0
    cycleData = (score < 100 || Math.random() < 0.3)
        ? getCycleShapes()
        : getCycleDigits()
    for (let i = 0; i < 4; i++) {
        (cycleData.type === 'shape'
            ? shapeCannonRender
            : digitCannonRender
        )(cycleData.cannons[i], i, cycleData.chosen === i)
    }
    livesRender(lives)
}

let audCurr = null
function audPlay(i) {
    if (audCurr) {
        audCurr.pause()
        audCurr.currentTime = 0
    }
    audCurr = i < 0 ? audNeg : audPos[i]
    audCurr.play().catch(() => {
        console.warn('should not start play automatically')
    })
}

let cycleData
let tCycle
let tSecPrev = 0
let Δt
function main(t) {
    window.requestAnimationFrame(main)
    let tSecCurr = t / 1000
    Δt = tSecCurr - tSecPrev
    tSecPrev = tSecCurr
    tCycle += Δt
    starsUpdate(Δt)
    starsRender(t)

    if (!cycleData) return

    if (isHandlingHit) {
        if (tCycle < 0.2) {
            zapRender()
        } else {
            isHandlingHit = false
            ptsRender(10)
            handleNewCycle()
        }
    } if (isHandlingMiss) {
        if (tCycle < 0.2) {
            shipShake(true)
        } else {
            isHandlingMiss = false
            shipShake(false)
        }
    } else {
        (cycleData.type === 'shape'
            ? shapeTargetRender
            : digitTargetRender
        )(cycleData.target, tCycle / cycleLength)
        if (tCycle > cycleLength) {
            handleMiss()
        }
    }
}

document.addEventListener('keydown', e => {
    if (isHandlingHit || e.altKey) return
    if (!cycleData) {
        handleGameNew()
        return
    }
    switch (e.keyCode) {
        case 37: // left
        case 38: // up
        case 39: // right
        case 40: // down
            if (cycleData.chosen === e.keyCode - 37) {
                handleHit()
            } else {
                handleMiss()
            }
        default:
    }
})

let xyStart = null
qs('svg').addEventListener('touchmove', e => e.preventDefault())
qs('svg').addEventListener('pointerdown', e => { // touchstart mousedown pointerdown
    xyStart = (!cycleData || isHandlingHit) ? null : {x: e.clientX, y: e.clientY}
})
qs('svg').addEventListener('pointerup', e => { // touchend mouseup pointerup
    if (!cycleData) {
        handleGameNew()
        return
    }
    if (!xyStart || isHandlingHit) return
    const dx = e.clientX - xyStart.x
    const dy = e.clientY - xyStart.y
    xyStart = null
    if (dx === 0 && dy === 0) return // no movement
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3)
    if (cycleData.chosen === dir) {
        handleHit()
    } else {
        handleMiss()
    }
})

qs('#scoreHigh').innerHTML = Number(scoreHigh).toLocaleString()
newGameCardRender()
starsInit(stars)
main(0)
