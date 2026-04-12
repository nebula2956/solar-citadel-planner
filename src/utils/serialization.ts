import LZString from 'lz-string'
import type { GridState } from '../types'

export function encodeLayout(state: GridState): string {
  const json = JSON.stringify(state)
  return LZString.compressToEncodedURIComponent(json)
}

export function decodeLayout(param: string): GridState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(param)
    if (!json) return null
    const parsed = JSON.parse(json)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray(parsed.placements) &&
      Array.isArray(parsed.teams)
    ) {
      return parsed as GridState
    }
    return null
  } catch {
    return null
  }
}

export function cellKey(col: number, row: number): string {
  return `${col},${row}`
}
