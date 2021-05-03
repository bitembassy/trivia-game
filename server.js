const express = require('express')
    , bodyParser = require('body-parser')
    , cookieParser = require('cookie-parser')
    , morgan = require('morgan')
    , stylus = require('stylus')
    , browserify = require('browserify-middleware')
    , { EventEmitter } = require('events')

const SECRET_KEY = process.env.SECRET_KEY

// Init app
const app = express()
app.set('view engine', 'pug')
app.set('views', './views')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser(SECRET_KEY))
app.use(morgan('combined'))
app.locals.pretty = true
app.use((req, res, next) => {
    let username = req.signedCookies.username
    if (username && scores.has(username)) {
        req.username = res.locals.username = username
    }
    next()
})

// Web UI
app.use('/_', stylus.middleware({ src: 'www', serve: true }))
app.use('/_', express.static('www'))
app.get('/play.js', browserify('client/play.js'))
app.get('/game.js', browserify('client/game.js'))
app.get('/admin.js', browserify('client/admin.js'))

app.get('/', (req, res) => req.username
  ? res.redirect('/play')
  : res.render('register'))
app.get('/play', (req, res) => req.username
  ? res.render('play')
  : res.redirect('/'))
app.get('/join', (req, res) => res.render('register'))
app.get('/game', (req, res) => res.render('game'))

// Model
const buzzers = []
    , scores = new Map
    , state = { scores, buzzers }
    , ev = new EventEmitter
    , emitUpdate = _ => {
        const json = encodeState(true)
        console.log('state updated:', json)
        ev.emit('update', json)
      }
    , encodeState = (asStr=false) =>
        asStr ? JSON.stringify(encodeState()) : { buzzers, scores: [ ...scores ] }

// API
app.post('/join', (req, res) => {
    const { name } = req.body
    if (!name || typeof name != 'string' || name.length < 3 || name.length > 20) return res.sendStatus(400)
    if (req.username === name) return res.redirect('play')
    if (scores.has(name)) return res.sendStatus(409)
    console.log(`joined: ${name}`)
    scores.set(name, 0)
    res.cookie('username', name, { signed: true, maxAge: 999999999999 })
    res.redirect('play')
    emitUpdate()
})
app.post('/buzz', (req, res) => {
    if (!req.username) return res.sendStatus(403)
    if (!scores.has(req.username)) return res.sendStatus(500)
    console.log(`buzzed: ${req.username}`)
    buzzers.includes(req.username) || buzzers.push(req.username)
    res.send(encodeState())
    emitUpdate()
})
app.get('/stream', (req, res) => {
    res.set({
      'X-Accel-Buffering': 'no'
    , 'Cache-Control': 'no-cache'
    , 'Content-Type': 'text/event-stream'
    , 'Connection': 'keep-alive'
    }).flushHeaders()

    const keepAlive = setInterval(_ => res.write(': keepalive\n\n'), 15000)
    const onUpdate = json => res.write(`data:${json}\n\n`)
    ev.on('update', onUpdate)
    onUpdate(encodeState(true))

    req.on('close', _ => (ev.removeListener('update', onUpdate)
                        , clearInterval(keepAlive)))
})

// Admin
const auth = (req, res, next) =>
  req.signedCookies.admin ? next() : res.sendStatus(401)

app.get('/admin', auth, (req, res) => res.render('admin'))

app.get(`/login-${SECRET_KEY}`, (req, res) =>
  res.cookie('admin', 1, { signed: true, maxAge: 999999999999 }).redirect('admin'))

app.post('/reset', auth, (req, res) => {
    console.log('admin: reset')
    buzzers.splice(0, buzzers.length)
    res.send(encodeState())
    emitUpdate()
})

app.post('/score', auth, (req, res) => {
    const { player, score } = req.body
    console.log(`admin: update score for ${player}: ${score}`)
    if (!scores.has(player)) return res.status(404).send('player not registered')
    scores.set(player, +scores.get(player) + +score)
    res.send(encodeState())
    emitUpdate()
})

// Go!
app.listen(process.env.PORT || 26411, _ => console.log('Trivia server running'))