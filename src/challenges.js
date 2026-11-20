// Rectangle, triangle and circle, each with a male and female connector.
const shapePairs = { RM: 'RF', RF: 'RM', TM: 'TF', TF: 'TM', CM: 'CF', CF: 'CM' }
const shapeIds = Object.keys(shapePairs)
const SHAPE_ROUND_CHANCE = 0.3
const stages = [
    { minScore: 300, total: 100, timeFactor: 0.99, resetRoundDuration: true },
    { minScore: 100, total: 10, timeFactor: 0.98 },
    { minScore: 0, total: null, timeFactor: 0.98 },
]

const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min))

function shuffle(items) {
    const result = items.slice()
    for (let i = result.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1)
        const item = result[i]
        result[i] = result[j]
        result[j] = item
    }
    return result
}

function shapeChallenge() {
    const cannons = shuffle(shapeIds).slice(0, 4)
    const chosen = randomInt(0, cannons.length)
    return { type: 'shape', chosen, cannons, target: shapePairs[cannons[chosen]] }
}

function numberChallenge(total) {
    const target = randomInt(total === 100 ? 10 : 1, total)
    const answer = total - target
    const alternatives = []
    // For a nonzero ones digit, complementing both digits independently overshoots by ten.
    if (total === 100 && target % 10 !== 0) alternatives.push(answer + 10)

    const pool = []
    for (let n = 1; n < total; n++) {
        if (n !== answer && !alternatives.includes(n)) pool.push(n)
    }
    alternatives.push(...shuffle(pool).slice(0, 3 - alternatives.length))
    const cannons = shuffle([answer, ...alternatives])
    return { type: 'number', target, cannons, chosen: cannons.indexOf(answer) }
}

export function stageForScore(score) {
    return stages.find(stage => score >= stage.minScore)
}

export function nextChallenge(stage, firstInStage = false) {
    if (stage.total === null || (!firstInStage && Math.random() < SHAPE_ROUND_CHANCE)) {
        return shapeChallenge()
    }
    return numberChallenge(stage.total)
}
