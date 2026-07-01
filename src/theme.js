function hexToRgb(hex) {
  const raw = String(hex || '').trim().replace('#', '')
  const normalized = raw.length === 3
    ? raw.split('').map(ch => ch + ch).join('')
    : raw
  const valid = /^[0-9a-fA-F]{6}$/.test(normalized)
  if (!valid) return '218,171,90'
  const num = parseInt(normalized, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r},${g},${b}`
}

export const THEMES = {
  jin: {
    name: '金',
    primary:       '#dba842',
    primaryDark:   '#a68a36',
    primaryLight:  '#f8f6f3',
    primaryShadow: 'rgba(218,171,90,0.30)',
    bgColor1:      '#f3ebdc',
    bgColor2:      '#faf9f8',
    iconDir:       '/images/themes/jin/',
  },
  mu: {
    name: '木',
    primary:       '#5d875b',
    primaryDark:   '#193d18',
    primaryLight:  '#eff5ed',
    primaryShadow: 'rgba(101, 135, 91, 0.3)',
    bgColor1:      '#e6f8e7',
    bgColor2:      '#f9fcf9',
    iconDir:       '/images/themes/mu/',
  },
  shui: {
    name: '水',
    primary:       '#71879B',
    primaryDark:   '#1D3144',
    primaryLight:  '#EDF2F6',
    primaryShadow: 'rgba(113,135,155,0.30)',
    bgColor1:      '#e5f0f9',
    bgColor2:      '#F8F8FA',
    iconDir:       '/images/themes/shui/',
  },
  huo: {
    name: '火',
    primary:       '#D36533',
    primaryDark:   '#841B11',
    primaryLight:  '#f6f0ed',
    primaryShadow: 'rgba(211,101,51,0.30)',
    bgColor1:      '#FEF2EC',
    bgColor2:      '#faf8f8',
    iconDir:       '/images/themes/huo/',
  },
  tu: {
    name: '土',
    primary:       '#A2876B',
    primaryDark:   '#59351F',
    primaryLight:  '#F6F0EA',
    primaryShadow: 'rgba(162,135,107,0.30)',
    bgColor1:      '#faf0e7',
    bgColor2:      '#faf9f8',
    iconDir:       '/images/themes/tu/',
  },
  feng: {
    name: '风',
    primary:       '#7ab0a2',
    primaryDark:   '#24524a',
    primaryLight:  '#eef7f6',
    primaryShadow: 'rgba(119,179,150,0.30)',
    bgColor1:      '#e6f7f4',
    bgColor2:      '#f8fafa',
    iconDir:       '/images/themes/feng/',
  },
}

export function buildThemeVars(key) {
  const t = THEMES[key] || THEMES.jin
  return {
    '--primary':           t.primary,
    '--primary-rgb':       hexToRgb(t.primary),
    '--primary-dark':      t.primaryDark,
    '--primary-dark-rgb':  hexToRgb(t.primaryDark),
    '--primary-light':     t.primaryLight,
    '--primary-light-rgb': hexToRgb(t.primaryLight),
    '--primary-shadow':    t.primaryShadow,
    '--bg-color-2':        t.bgColor2,
    '--page-bg':           `linear-gradient(180deg,${t.bgColor1} 0%,${t.bgColor2} 90%)`,
  }
}

export function buildThemeStyle(key) {
  const vars = buildThemeVars(key)
  return Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')
}
