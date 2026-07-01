function readOrigin() {
  const cs = getComputedStyle(document.documentElement)
  const num = (name, fallback) => {
    const raw = cs.getPropertyValue(name).trim()
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : fallback
  }

  return {
    x: num('--dialog-origin-x', window.innerWidth - 24),
    y: num('--dialog-origin-y', 24),
    w: Math.max(10, num('--dialog-origin-w', 28)),
    h: Math.max(10, num('--dialog-origin-h', 28)),
  }
}

function removeGhost() {
  document.querySelectorAll('.dialog-curtain-ghost').forEach(node => node.remove())
}

function createGhost() {
  removeGhost()
  const ghost = document.createElement('div')
  ghost.className = 'dialog-curtain-ghost'
  Object.assign(ghost.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: '0px',
    height: '0px',
    borderRadius: '999px',
    background: '#fff',
    boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
    pointerEvents: 'none',
    zIndex: '10000',
    willChange: 'left, top, width, height, border-radius, opacity',
    backfaceVisibility: 'hidden',
    transform: 'translateZ(0)',
  })
  document.body.appendChild(ghost)
  return ghost
}

function prepareChildren(popup) {
  const kids = Array.from(popup.children)
  kids.forEach((node, i) => {
    const startY = i === 1 ? 28 : 18
    const startSkew = i === 1 ? 0 : 4
    node.style.opacity = '0'
    node.style.transform = `translate3d(0, ${startY}px, 0) skewY(${startSkew}deg)`
    node.style.willChange = 'opacity, transform'
  })
}

function animateChildrenIn(popup) {
  const kids = Array.from(popup.children)
  kids.forEach((node, i) => {
    const startY = i === 1 ? 28 : 18
    const startSkew = i === 1 ? 0 : 4

    const animation = node.animate(
      [
        { opacity: 0, transform: `translate3d(0, ${startY}px, 0) skewY(${startSkew}deg)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0) skewY(0deg)' },
      ],
      {
        duration: 100,
        delay: 220 + i * 60,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      },
    )

    animation.onfinish = () => {
      node.style.opacity = ''
      node.style.transform = ''
      node.style.willChange = ''
    }
  })
}

function animateChildrenOut(popup) {
  const kids = Array.from(popup.children)
  kids.forEach((node, i) => {
    node.animate(
      [
        { opacity: 1, transform: 'translate3d(0, 0, 0) skewY(0deg)' },
        { opacity: 0, transform: 'translate3d(0, 10px, 0) skewY(-2deg)' },
      ],
      {
        duration: 160,
        delay: i * 10,
        easing: 'ease',
        fill: 'both',
      },
    )
  })
}

function runEnter(el, popupSelector, done) {
  const popup = el.querySelector(popupSelector)
  if (!popup) {
    done()
    return
  }

  const origin = readOrigin()
  const target = popup.getBoundingClientRect()
  const ghost = createGhost()

  document.body.classList.add('dialog-open')
  el.style.pointerEvents = 'none'

  // Fade mask in.
  el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: 180, easing: 'ease', fill: 'both' },
  )

  const sx = origin.w
  const sy = origin.h
  const sLeft = origin.x - sx / 2
  const sTop = origin.y - sy / 2

  const tLeft = target.left
  const tTop = target.top
  const tW = target.width
  const tH = target.height

  const ghostAnim = ghost.animate(
    [
      {
        left: `${sLeft}px`,
        top: `${sTop}px`,
        width: `${sx}px`,
        height: `${sy}px`,
        borderRadius: '999px',
        opacity: 1,
      },
      {
        left: `${tLeft - (tW * 0.03)}px`,
        top: `${tTop - (tH * 0.05)}px`,
        width: `${tW * 1.06}px`,
        height: `${tH * 1.08}px`,
        borderRadius: '26px',
        opacity: 1,
        offset: 0.58,
      },
      {
        left: `${tLeft}px`,
        top: `${tTop}px`,
        width: `${tW}px`,
        height: `${tH}px`,
        borderRadius: '12px',
        opacity: 1,
        offset: 0.75,
      },
      {
        left: `${tLeft}px`,
        top: `${tTop}px`,
        width: `${tW}px`,
        height: `${tH}px`,
        borderRadius: '12px',
        opacity: 0,
      },
    ],
    {
      duration: 650,
      easing: 'cubic-bezier(0.85, 0, 0.15, 1)',
      fill: 'both',
    },
  )

  // Hide the popup panel entirely until the ghost expansion is nearly complete.
  popup.style.opacity = '0'
  popup.style.visibility = 'hidden'
  popup.style.overflow = 'hidden'

  const revealTimer = window.setTimeout(() => {
    popup.style.visibility = 'visible'
    const popupFade = popup.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
    )
    popupFade.onfinish = () => {
      popup.style.opacity = ''
      popup.style.visibility = ''
      popup.style.overflow = ''
    }
    prepareChildren(popup)
    animateChildrenIn(popup)
  }, 300)

  ghostAnim.onfinish = () => {
    window.clearTimeout(revealTimer)
    ghost.remove()
    el.style.pointerEvents = ''
    done()
  }
  ghostAnim.oncancel = () => {
    window.clearTimeout(revealTimer)
    ghost.remove()
    el.style.pointerEvents = ''
    done()
  }
}

function runLeave(el, popupSelector, done) {
  const popup = el.querySelector(popupSelector)
  if (!popup) {
    document.body.classList.remove('dialog-open')
    done()
    return
  }

  const origin = readOrigin()
  const from = popup.getBoundingClientRect()
  const ghost = createGhost()

  popup.style.opacity = '0'
  animateChildrenOut(popup)

  el.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: 220, easing: 'ease', fill: 'both' },
  )

  const sLeft = origin.x - origin.w / 2
  const sTop = origin.y - origin.h / 2

  const ghostAnim = ghost.animate(
    [
      {
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        borderRadius: '12px',
        opacity: 1,
      },
      {
        left: `${sLeft}px`,
        top: `${sTop}px`,
        width: `${origin.w}px`,
        height: `${origin.h}px`,
        borderRadius: '999px',
        opacity: 0.96,
      },
    ],
    {
      duration: 380,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both',
    },
  )

  ghostAnim.onfinish = () => {
    ghost.remove()
    document.body.classList.remove('dialog-open')
    done()
  }
  ghostAnim.oncancel = () => {
    ghost.remove()
    document.body.classList.remove('dialog-open')
    done()
  }
}

export function helpCurtainBeforeEnter(el) {
  el.style.opacity = '0'
}

export function helpCurtainEnter(el, done) {
  runEnter(el, '.help-popup', done)
}

export function helpCurtainLeave(el, done) {
  runLeave(el, '.help-popup', done)
}

export function themeCurtainBeforeEnter(el) {
  el.style.opacity = '0'
}

export function themeCurtainEnter(el, done) {
  runEnter(el, '.theme-popup', done)
}

export function themeCurtainLeave(el, done) {
  runLeave(el, '.theme-popup', done)
}
