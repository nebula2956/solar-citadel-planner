// 通常行軍係数（非太陽城）
export const MARCH_BASE_NORMAL = 8.48019
export const MARCH_COEF_NORMAL = 2.15827

// 太陽城行軍係数
export const MARCH_BASE_SC = 5.2337
export const MARCH_COEF_SC = 5.4502

/** 右下マス座標 + (span-1)/2 = 中心点 */
export function toCenter(x: number, y: number, cellSpan: number): [number, number] {
  return [x + (cellSpan - 1) / 2, y + (cellSpan - 1) / 2]
}

/** ユークリッド距離 */
export function calcDistance(src: [number, number], dst: [number, number]): number {
  const dx = src[0] - dst[0]
  const dy = src[1] - dst[1]
  return Math.sqrt(dx * dx + dy * dy)
}

/** 行軍時間（秒・整数）
 * @param srcGameXY   出発地の右下マスゲーム座標 [x, y]
 * @param srcCellSpan 出発地の建造物サイズ
 * @param dstGameXY   目的地の右下マスゲーム座標 [x, y]
 * @param dstCellSpan 目的地の建造物サイズ
 * @param passiveBonus 速度パッシブボーナス (例: 0.25)
 * @param petBonus     ペット速度ボーナス (例: 0.30)
 * @param isSolarCitadel 目的地が太陽城かどうか
 */
export function calcMarchTime(
  srcGameXY: [number, number],
  srcCellSpan: number,
  dstGameXY: [number, number],
  dstCellSpan: number,
  passiveBonus: number,
  petBonus: number,
  isSolarCitadel = false
): number {
  const base = isSolarCitadel ? MARCH_BASE_SC : MARCH_BASE_NORMAL
  const coef = isSolarCitadel ? MARCH_COEF_SC : MARCH_COEF_NORMAL
  const src = toCenter(srcGameXY[0], srcGameXY[1], srcCellSpan)
  const dst = toCenter(dstGameXY[0], dstGameXY[1], dstCellSpan)
  const dist = calcDistance(src, dst)
  const speedMult = 1 + passiveBonus + petBonus
  return Math.round(base + coef * dist / speedMult)
}

/** 秒を "Xm Ys" 形式の文字列に変換 */
export function formatMarchTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}
