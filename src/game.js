import { captureGameEvent } from './analytics.js'
import { nextChallenge, stageForScore } from './challenges.js'
import {
    animateStars, clearRound, field, initializeView, ptsRender,
    renderChallenge, renderLives, renderScores, renderStage, renderTarget,
    setStartCardVisible, shipShake, zapRender,
} from './view.js'

const MAX_LIVES = 3
const POINTS_PER_HIT = 10
const INITIAL_ROUND_SECONDS = 10
const FEEDBACK_SECONDS = 0.2
const WARP_SECONDS = 1.4
const directions = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']

// Literal URLs allow Parcel to include the sounds in both development and production.
const missSound = new Audio(new URL('./aud/neg.mp3', import.meta.url))
const warpSound = new Audio(new URL('./aud/warp.mp3', import.meta.url))
const hitSounds = [
    new Audio(new URL('./aud/pos0.mp3', import.meta.url)),
    new Audio(new URL('./aud/pos1.mp3', import.meta.url)),
    new Audio(new URL('./aud/pos2.mp3', import.meta.url)),
    new Audio(new URL('./aud/pos3.mp3', import.meta.url)),
]
let currentSound
let highScore = 0
try {
    highScore = Number(localStorage.getItem('highScore')) || 0
} catch {
    // The game can run when browser storage is unavailable.
}

let score = 0
let lives = MAX_LIVES
let roundDuration = INITIAL_ROUND_SECONDS
let elapsed = 0
let previousFrame
let phase = 'idle'
let stage
let challenge
let swipeStart

function play(sound) {
    if (currentSound) {
        currentSound.pause()
        currentSound.currentTime = 0
    }
    currentSound = sound
    sound.play().catch(() => {})
}

function startRound(firstInStage = false) {
    elapsed = 0
    swipeStart = null
    challenge = nextChallenge(stage, firstInStage)
    phase = 'round'
    renderChallenge(challenge)
}

function startGame() {
    score = 0
    lives = MAX_LIVES
    roundDuration = INITIAL_ROUND_SECONDS
    previousFrame = undefined
    renderScores(score, highScore)
    renderLives(lives, MAX_LIVES)
    stage = stageForScore(score)
    renderStage(stage.total)
    startRound()
    setStartCardVisible(false)
    captureGameEvent('game_started')
}

function endGame() {
    phase = 'idle'
    clearRound()
    setStartCardVisible(true)
    if (score > highScore) {
        highScore = score
        renderScores(score, highScore)
        try {
            localStorage.setItem('highScore', highScore)
        } catch {
            // Keep the session's high score even if it cannot be saved.
        }
    }
    captureGameEvent('game_finished', { score, high_score: highScore })
}

function miss() {
    elapsed = 0
    swipeStart = null
    phase = 'miss'
    lives--
    renderLives(lives, MAX_LIVES)
    play(missSound)
    navigator.vibrate?.([50, 50, 100])
}

function choose(direction) {
    if (phase !== 'round') return
    if (direction !== challenge.chosen) {
        miss()
        return
    }
    elapsed = 0
    phase = 'hit'
    play(hitSounds[direction])
}

function finishHit() {
    score += POINTS_PER_HIT
    roundDuration *= stage.timeFactor
    renderScores(score, highScore)
    ptsRender(POINTS_PER_HIT)

    const nextStage = stageForScore(score)
    if (nextStage === stage) {
        startRound()
        return
    }

    stage = nextStage
    if (stage.resetRoundDuration) roundDuration = INITIAL_ROUND_SECONDS
    phase = 'warp'
    elapsed = 0
    swipeStart = null
    clearRound()
    warpSound.currentTime = 0
    warpSound.play().catch(() => {})
}

function frame(now) {
    const delta = previousFrame === undefined ? 0 : (now - previousFrame) / 1000
    previousFrame = now
    window.requestAnimationFrame(frame)
    if (document.hidden) return

    if (phase === 'warp') {
        elapsed += delta
        animateStars(delta, Math.min(elapsed / WARP_SECONDS, 1))
        if (elapsed >= WARP_SECONDS) {
            renderStage(stage.total)
            startRound(true)
        }
        return
    }

    animateStars(delta)

    if (phase === 'idle') return
    if (phase === 'round') {
        elapsed += delta
        renderTarget(challenge, Math.min(elapsed / roundDuration, 1))
        if (elapsed >= roundDuration) miss()
        return
    }

    elapsed += delta
    if (phase === 'hit') {
        if (elapsed < FEEDBACK_SECONDS) {
            zapRender()
            return
        }
        finishHit()
    } else {
        shipShake(elapsed < FEEDBACK_SECONDS)
        if (elapsed < FEEDBACK_SECONDS) return
        if (lives > 0) startRound()
        else endGame()
    }
}

document.addEventListener('visibilitychange', () => {
    previousFrame = undefined
    swipeStart = null
})

document.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
    const direction = directions.indexOf(event.key)
    if (direction !== -1 || event.key === ' ') event.preventDefault()
    if (phase === 'idle') startGame()
    else if (direction !== -1) choose(direction)
})

field.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || (phase !== 'round' && phase !== 'idle')) return
    swipeStart = { id: event.pointerId, x: event.clientX, y: event.clientY }
    field.setPointerCapture(event.pointerId)
})

field.addEventListener('pointerup', event => {
    if (swipeStart?.id !== event.pointerId) return
    const dx = event.clientX - swipeStart.x
    const dy = event.clientY - swipeStart.y
    swipeStart = null
    if (phase === 'idle') {
        startGame()
    } else if (dx !== 0 || dy !== 0) {
        const direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3)
        choose(direction)
    }
})

field.addEventListener('pointercancel', event => {
    if (swipeStart?.id === event.pointerId) swipeStart = null
})

initializeView()
renderScores(score, highScore)
window.requestAnimationFrame(frame)
