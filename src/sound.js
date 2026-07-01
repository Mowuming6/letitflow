// Programmatic sound synthesis — no audio files needed
// Ported from miniprogram/utils/sound.js

let _actx = null

function getCtx() {
  if (!_actx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) _actx = new AC()
  }
  return _actx
}

function prepare() {
  const c = getCtx()
  if (!c) return null
  try { if (c.state !== 'running') c.resume() } catch (e) {}
  return c
}

function noiseBuf(c, dur) {
  const sr = c.sampleRate || 44100
  const len = Math.ceil(sr * dur)
  const buf = c.createBuffer(1, len, sr)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function noise(c, t0, dur, gain, atk, fType, fFreq, fQ) {
  try {
    const src = c.createBufferSource()
    src.buffer = noiseBuf(c, dur)
    const flt = c.createBiquadFilter()
    flt.type = fType || 'lowpass'
    flt.frequency.value = fFreq || 1000
    flt.Q.value = fQ || 1
    const gn = c.createGain()
    gn.gain.setValueAtTime(0.001, t0)
    gn.gain.linearRampToValueAtTime(gain, t0 + atk)
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
    src.connect(flt); flt.connect(gn); gn.connect(c.destination)
    src.start(t0)
    src.stop(t0 + dur + 0.05)
  } catch (e) {}
}

function tone(c, t0, freq, type, dur, gain, atk, dec, freqEnd) {
  try {
    const osc = c.createOscillator()
    osc.type = type || 'sine'
    osc.frequency.setValueAtTime(freq, t0)
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
    const gn = c.createGain()
    gn.gain.setValueAtTime(0.001, t0)
    gn.gain.linearRampToValueAtTime(gain, t0 + atk)
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + dec)
    osc.connect(gn); gn.connect(c.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  } catch (e) {}
}

let _wheel = null

function _wheelStart() {
  if (_wheel) return
  const c = prepare()
  if (!c) return
  const now = c.currentTime
  try {
    const sr = c.sampleRate || 44100
    const tickLen = Math.floor(sr * 0.1)
    const buf = c.createBuffer(1, tickLen, sr)
    const d = buf.getChannelData(0)
    const impLen = Math.floor(sr * 0.012)
    for (let i = 0; i < tickLen; i++) {
      d[i] = i < impLen ? (Math.random() * 2 - 1) * Math.pow(1 - i / impLen, 1.5) : 0
    }
    const src = c.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.playbackRate.setValueAtTime(3.0, now)
    src.playbackRate.exponentialRampToValueAtTime(0.4, now + 4.0)
    const flt = c.createBiquadFilter()
    flt.type = 'bandpass'
    flt.frequency.value = 900
    flt.Q.value = 2.5
    const gn = c.createGain()
    gn.gain.setValueAtTime(0.001, now)
    gn.gain.linearRampToValueAtTime(0.68, now + 0.25)
    src.connect(flt); flt.connect(gn); gn.connect(c.destination)
    src.start(now)
    _wheel = { src, gn }
  } catch (e) {}
}

function _wheelStop() {
  if (!_wheel) return
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const { src, gn } = _wheel
  _wheel = null
  try {
    gn.gain.cancelScheduledValues(now)
    gn.gain.setValueAtTime(0.68, now)
    gn.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    setTimeout(() => { try { src.stop() } catch (e) {} }, 350)
  } catch (e) {}
}

const SOUNDS = {
  diceRoll(c, t) {
    noise(c, t,        0.07, 1.8, 0.003, 'lowpass', 1400, 1)
    noise(c, t + 0.05, 0.07, 1.5, 0.003, 'lowpass', 1200, 1)
    noise(c, t + 0.10, 0.07, 1.2, 0.003, 'lowpass', 1500, 1)
  },
  coinFlip(c, t) {
    tone (c, t,        3000, 'sine', 0.18, 0.20, 0.001, 0.40)
    tone (c, t,        4000, 'sine', 0.10, 0.10, 0.001, 0.07)
    noise(c, t,        0.06, 0.62, 0.003, 'highpass', 2800, 1)
  },
  coinLand(c, t) {
    noise(c, t,        0.07, 0.85, 0.003, 'lowpass', 4000, 1)
    noise(c, t + 0.05, 0.07, 0.78, 0.003, 'lowpass', 3000, 1)
    noise(c, t + 0.10, 0.07, 0.70, 0.003, 'lowpass',  1000, 1)
  },
  stickShake(c, t) {
    noise(c, t, 0.45, 0.58, 0.05, 'bandpass', 600 + Math.random() * 400, 0.8)
    for (let i = 0; i < 5; i++) {
      const delay = Math.random() * 0.5
      if (Math.random() > 0.5) {
        tone(c, t + delay, 150 + Math.random() * 200, 'triangle', 0.12, 0.54, 0.001, 0.03)
      }
      noise(c, t + delay, 0.03, 0.56, 0.002, 'bandpass', 1200 + Math.random() * 800, 1.5)
    }
  },
  stickLand(c, t) {
    noise(c, t,        0.10, 0.98, 0.002, 'lowpass', 750, 1)
    noise(c, t + 0.04, 0.06, 0.90, 0.002, 'lowpass', 550, 1)
  },
  pageTurn(c, t) {
    for (let i = 0; i < 5; i++) {
      const dt   = i * 0.15 + (Math.random() - 0.5) * 0.02
      const gain = 0.50 - i * 0.022 + Math.random() * 0.04
      noise(c, t + dt, 0.10,  gain * 0.6, 0.01,  'lowpass',  500 + Math.random() * 300, 0.4)
      noise(c, t + dt, 0.058, gain,        0.004, 'bandpass', 800 + Math.random() * 1200, 0.7)
      noise(c, t + dt, 0.040, gain * 0.5,  0.003, 'highpass', 1000, 0.5)
    }
  },
  cardShuffle(c, t) {
    for (let i = 0; i < 6; i++) {
      noise(c, t + i * 0.07, 0.07, 0.68, 0.005, 'bandpass', 1600 + i * 40, 1.2)
    }
  },
  cardDraw(c, t) {
    noise(c, t, 0.10, 0.68, 0.008, 'bandpass', 1450, 1.5)
  },
  cardReveal(c, t) {
    tone(c, t,        880,  'sine', 0.7, 0.31, 0.005, 0.65)
    tone(c, t + 0.12, 1100, 'sine', 0.6, 0.31, 0.005, 0.55)
  },
  cardTick(c, t) {
    // Highly crisp, sub-millisecond physical card tick sound
    noise(c, t, 0.015, 0.55, 0.001, 'bandpass', 1800, 1.8)
  },
  diceBounce(c, t, vel) {
    const gain = Math.min(2.0, vel * 0.09 + 1.0)
    const dur  = Math.min(0.09, 0.025 + vel * 0.005)
    noise(c, t, dur,       gain,       0.001, 'lowpass', 1000 + vel * 30, 1)
    tone (c, t, 200, 'sine', dur * 1.3, gain * 0.5, 0.001, dur, 100)
  },
}

function vib(type) {
  try {
    if (navigator.vibrate) {
      const ms = type === 'heavy' ? 80 : type === 'medium' ? 40 : 20
      navigator.vibrate(ms)
    }
  } catch (e) {}
}

const VIBRATIONS = {
  diceRoll:    'medium',
  coinFlip:    'light',
  coinLand:    'medium',
  stickShake:  'medium',
  stickLand:   'medium',
  pageTurn:    'light',
  cardShuffle: 'medium',
  cardDraw:    'light',
  cardReveal:  'medium',
}

export function play(name) {
  if (name === 'wheelSpin') { _wheelStart(); vib('light'); return }
  const fn = SOUNDS[name]
  if (!fn) return
  const c = prepare()
  if (!c) return
  fn(c, c.currentTime + 0.01)
  const vt = VIBRATIONS[name]
  if (vt) vib(vt)
}

export function playLoop(name) {
  if (name === 'wheelSpin') { _wheelStart(); vib('light'); return }
  play(name)
}

export function stop(name) {
  if (name === 'wheelSpin') _wheelStop()
}

export function playBounce(vel) {
  const fn = SOUNDS.diceBounce
  if (!fn) return
  const c = prepare()
  if (!c) return
  fn(c, c.currentTime + 0.01, vel)
  vib(vel > 7 ? 'heavy' : vel > 3 ? 'medium' : 'light')
}
