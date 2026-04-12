import { CELL_SIZE } from '../constants/gridConfig'
import type { Placement } from '../types'

// アイソメトリック視覚頂点とゲーム座標の対応：
//   上頂点: col=0,  row=0  → x=613, y=613
//   右頂点: col=27, row=0  → x=613, y=586  ← col増加でy減少
//   下頂点: col=27, row=27 → x=586, y=586
//   左頂点: col=0,  row=27 → x=586, y=613  ← row増加でx減少
//
//   x = GAME_COORD_MAX - row  (613 - row)
//   y = GAME_COORD_MAX - col  (613 - col)  ← 上がy=613(col=0)、右がy=586(col=27)
//
// 検証:
//   上(0,0):   x=613, y=613 ✓
//   右(27,0):  x=613, y=586 ✓
//   下(27,27): x=586, y=586 ✓
//   左(0,27):  x=586, y=613 ✓
const GAME_COORD_MAX = 613

export function toGameCoord(col: number, row: number): { x: number; y: number } {
  return {
    x: GAME_COORD_MAX - row,
    y: GAME_COORD_MAX - col,
  }
}

// 太陽城(6×6)を含む12×12の排除ゾーンを計算
// 太陽城の中心 = (col+3, row+3)
// ゾーンtop-left = (col+3-6, row+3-6) = (col-3, row-3)
// ゾーン範囲: col[col-3, col+9), row[row-3, row+9)
export function getExclusionZone(sc: Placement) {
  return {
    colMin: sc.col - 3,  // inclusive
    colMax: sc.col + 9,  // exclusive
    rowMin: sc.row - 3,  // inclusive
    rowMax: sc.row + 9,  // exclusive
  }
}

// アイソメトリック変換定数
export const TILE_W = CELL_SIZE        // ひし形の横幅
export const TILE_H = CELL_SIZE / 2    // ひし形の縦幅

// 論理座標 → アイソメトリック画面座標（ボード原点相対）
// originX = gridHeight * (TILE_W / 2) をボード側で加算する
export function toIso(col: number, row: number): { sx: number; sy: number } {
  return {
    sx: (col - row) * (TILE_W / 2),
    sy: (col + row) * (TILE_H / 2),
  }
}

// アイソメトリック画面座標 → 論理座標（originXを引いた後の値を渡す）
export function fromIso(relX: number, relY: number): { col: number; row: number } {
  return {
    col: Math.floor((relX / (TILE_W / 2) + relY / (TILE_H / 2)) / 2),
    row: Math.floor((relY / (TILE_H / 2) - relX / (TILE_W / 2)) / 2),
  }
}
