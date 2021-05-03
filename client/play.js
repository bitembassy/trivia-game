const EventSource = require('reconnecting-eventsource').default

// Prevent screen lock
const noSleep = new (require('./NoSleep'))
document.addEventListener('click', function enableNoSleep() {
  document.removeEventListener('click', enableNoSleep, false)
  noSleep.enable()
}, false)

const vibrate = seq => navigator.vibrate && navigator.vibrate(seq)

// Init
const myName = document.querySelector('meta[name=user]').content
    , buzzerEl = document.querySelector('#buzzer')

// Buzzer button
async function buzz() {
    noSleep.lastActive = Date.now()
    vibrate([100])
    document.body.classList.add('pending')
    const res = await fetch('/buzz', { method: 'POST' })
    document.body.classList.remove('pending')
    if (!res.ok) throw new Error(`invalid response code ${res.status}`)
    const state = await res.json()
    vibrate(state.buzzers[0] == myName ? [150,50,150] : [100])
    updateState(state)
}
const buzzEv = ('ontouchstart' in window ? 'touchstart' : 'click')
buzzerEl.addEventListener(buzzEv, buzz)

// State
function updateState({ buzzers }) {
    const myPosition = buzzers.indexOf(myName)
        , myStatus = myPosition == 0 ? 'leader'
                 : myPosition > 0 ? 'runner'
                 : 'can-press'
        , roundStatus = buzzers.length ? 'active' : 'new'
    
    document.body.dataset.myStatus = myStatus
    document.body.dataset.roundStatus = roundStatus
    document.body.classList.add('loaded')
    buzzerEl.disabled = (myStatus != 'can-press')
}

function stream() {
    const es = new EventSource('stream')
    es.addEventListener('message', msg =>
        updateState(JSON.parse(msg.data)))
}
stream()
