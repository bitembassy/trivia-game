const EventSource = require('reconnecting-eventsource').default

// Prevent screen lock
const noSleep = new (require('./NoSleep'))
document.addEventListener('click', function enableNoSleep() {
  document.removeEventListener('click', enableNoSleep, false)
  noSleep.enable()
}, false)

// Actions

const resetEl = document.querySelector('button#reset-round')
async function resetRound() {
    preventInteraction()
    const res = await fetch('/reset', { method: 'POST' })
    if (!res.ok) throw new Error(`invalid response ${res.code}`)
    updateState(await res.json())
}
resetEl.addEventListener('click', resetRound)

async function changeScore(player, score) {
    preventInteraction()
    const body = new URLSearchParams({ player, score })
    const res = await fetch('/score', { method: 'POST', body })
    if (!res.ok) throw new Error(`invalid response ${res.code}`)
    updateState(await res.json())
}

// State

function updateState({ scores, buzzers }) {
    console.log('update state:', { scores })
    document.body.classList.add('loaded')
    updateScores(scores)
    updateBuzzers(buzzers)
}

function stream() {
    const es = new EventSource('stream')
    es.addEventListener('message', msg =>
        updateState(JSON.parse(msg.data)))
}
stream()

// View

function clearEl(el) {
    while (el.firstChild) el.removeChild(el.firstChild)
}

const playersEl = document.querySelector('ul#players')
function updateScores(scores) {
    clearEl(playersEl)
    scores.forEach(([ player, score ]) => {
        const playerEl = document.createElement('li')
            , scoreEl = document.createElement('span')
            , plusEl = document.createElement('button')
            , minusEl = document.createElement('button')
        playerEl.innerText = player + ' '
        scoreEl.innerText = score
        scoreEl.className = 'badge badge-pill badge-primary mr-2'
        playerEl.prepend(scoreEl)
        minusEl.className = 'btn btn-danger btn-sxm mr-4'
        minusEl.innerText = '-'
        minusEl.addEventListener('click', _ => changeScore(player, -1))
        playerEl.prepend(minusEl)
        plusEl.className = 'btn btn-success btn-sxm mr-4'
        plusEl.innerText = '+'
        plusEl.addEventListener('click', _ => changeScore(player, +1))
        playerEl.prepend(plusEl)
        playersEl.append(playerEl)
    })
}

function updateBuzzers(buzzers) {
    resetEl.disabled = buzzers.length == 0
}

function preventInteraction() {
    document.body.classList.add('blocked')
    setTimeout(_ => document.body.classList.remove('blocked'), 500)
}