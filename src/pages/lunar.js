'use strict'

const BASE_YEAR = 1990
const CNY = [
  [1,27],[2,15],[2,4],[1,23],[2,10],
  [1,31],[2,19],[2,7],[1,28],[2,16],
  [2,5],[1,24],[2,12],[2,1],[1,22],
  [2,9],[1,29],[2,18],[2,7],[1,26],
  [2,14],[2,3],[1,23],[2,10],[1,31],
  [2,19],[2,8],[1,28],[2,16],[2,5],
  [1,25],[2,12],[2,1],[1,22],[2,10],
  [1,29],[2,17],[2,6],[1,26],[2,13],
  [2,3],[1,23],[2,11],[1,31],[2,19],
  [2,8],[1,28],[2,15],[2,4],[1,24],
  [2,12],[2,1],[1,22],[2,10],[1,30],
  [2,17],[2,6],[1,26],[2,14],[2,2],
  [1,22],
]

function cnyUtcDays(year) {
  const idx = year - BASE_YEAR
  if (idx < 0 || idx >= CNY.length) return null
  const md = CNY[idx]
  return Date.UTC(year, md[0] - 1, md[1]) / 86400000
}

export function getLunarDate(date) {
  const sy = date.getFullYear()
  const sm = date.getMonth() + 1
  const sd = date.getDate()
  const today = Date.UTC(sy, sm - 1, sd) / 86400000
  let lunarYear, cnyDays
  const curCny = cnyUtcDays(sy)
  if (curCny !== null && today >= curCny) {
    lunarYear = sy; cnyDays = curCny
  } else {
    const prevCny = cnyUtcDays(sy - 1)
    lunarYear = sy - 1
    cnyDays = prevCny !== null ? prevCny : Date.UTC(sy - 1, 1, 5) / 86400000
  }
  const daysSinceCNY = today - cnyDays
  const lunarMonth = Math.floor(daysSinceCNY / 29.5306) + 1
  const lunarDay   = Math.floor(daysSinceCNY % 29.5306) + 1
  const yearBranch = ((lunarYear - 4) % 12 + 12) % 12 + 1
  return { lunarYear, lunarMonth, lunarDay, yearBranch }
}

export function getTimeBranch(hour) {
  if (hour === 23) return 1
  return Math.floor((hour + 1) / 2) + 1
}
