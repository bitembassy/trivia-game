const EventSource = require('reconnecting-eventsource').default

let hadBuzzers = null
function updateState({ buzzers, scores }) {
    console.log('update state:', { buzzers, scores })
    if (hadBuzzers === false && buzzers.length > 0) makeSound()
    hadBuzzers = (buzzers.length > 0)

    updateBuzzers(buzzers)
    updateScores(scores)

    document.body.classList.add('loaded')
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

const buzzersEl = document.querySelector('#buzzers ul')
function updateBuzzers(buzzers) {
    clearEl(buzzersEl)
    buzzers.forEach((player, position) => {
        const buzzerEl = document.createElement('li')
        buzzerEl.innerText = (position == 0 ? '✨ ' : '') + player
        buzzersEl.appendChild(buzzerEl)
    })
    if (buzzers.length) document.body.classList.add('game-started')
    document.body.classList[buzzers.length?'add':'remove']('round-started')
}

const leadersEl = document.querySelector('#leaderboard ul')
function updateScores(scores) {
    clearEl(leadersEl)
    let hadScores = false
    scores.sort(([_, a], [__, b]) => b - a)
    scores.forEach(([ player, score ], place) => {
        const playerEl = document.createElement('li')
            , scoreEl = document.createElement('span')
            , isLeader = (place == 0 && scores[1] && scores[1][1] != score)
        playerEl.innerText = (isLeader ? '👑 ' : '') + player + ' '
        scoreEl.innerText = score
        scoreEl.className = 'badge badge-pill badge-primary'
        playerEl.appendChild(scoreEl)
        leadersEl.appendChild(playerEl)
        hadScores = hadScores || score != 0
    })
    if (scores.length) document.body.classList.add('has-players')
    if (hadScores) document.body.classList.add('has-scores')
}

const audio = new Audio('_/beep.mp3')
function makeSound() { audio.play() }