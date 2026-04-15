import { CELL_SIZE } from '../constants/gridConfig'
import type { Placement, GridState } from '../types'

// アイソメトリック視覚頂点とゲーム座標の対応：
//   x = gridXMax - row
//   y = gridYMax - col
const GAME_COORD_MAX = 613  // 後方互換のため維持

export function toGameCoord(col: number, row: number): { x: number; y: number } {
  return {
    x: GAME_COORD_MAX - row,
    y: GAME_COORD_MAX - col,
  }
}

export function toGameCoordFromState(col: number, row: number, state: Pick<GridState, 'gridXMax' | 'gridYMax'>): { x: number; y: number } {
  return {
    x: state.gridXMax - row,
    y: state.gridYMax - col,
  }
}

// 太陽城(6×6)を含む12×12の排除ゾーンを計算
export function getExclusionZone(sc: Placement) {
  return {
    colMin: sc.col - 3,
    colMax: sc.col + 9,
    rowMin: sc.row - 3,
    rowMax: sc.row + 9,
  }
}

// 同盟本部・旗のエリア範囲を計算（areaRadius = 中心からのマス数）
// cellSpanのオブジェクトの中心 = (col + floor(span/2), row + floor(span/2))
export function getAllianceArea(p: Placement, cellSpan: number, areaRadius: number) {
  const centerCol = p.col + Math.floor(cellSpan / 2)
  const centerRow = p.row + Math.floor(cellSpan / 2)
  return {
    colMin: centerCol - areaRadius,
    colMax: centerCol + areaRadius + 1,  // exclusive
    rowMin: centerRow - areaRadius,
    rowMax: centerRow + areaRadius + 1,  // exclusive
  }
}

// セル(c, r)のエリア所有者チームIDを返す（先置き優先: placements配列の先頭 = 先置き）
// null = 誰のエリアでもない
export function getAreaOwnerAtCell(c: number, r: number, placements: Placement[], objectDefs: Record<string, { areaRadius?: number; cellSpan: number }>): string | null {
  for (const owner of placements) {
    if (owner.teamId === '' || (owner.type !== 'alliance_hq' && owner.type !== 'flag')) continue
    const def = objectDefs[owner.type]
    if (def.areaRadius === undefined) continue
    const area = getAllianceArea(owner, def.cellSpan, def.areaRadius)
    if (c >= area.colMin && c < area.colMax && r >= area.rowMin && r < area.rowMax) {
      return owner.teamId
    }
  }
  return null
}

type AreaRect = { colMin: number; colMax: number; rowMin: number; rowMax: number }

// 2つのエリア矩形が接触（重複・辺・角）しているか（colMax/rowMaxはexclusive）
export function areasTouch(a: AreaRect, b: AreaRect): boolean {
  return (
    a.colMin < b.colMax && b.colMin < a.colMax &&
    a.rowMin < b.rowMax && b.rowMin < a.rowMax
  )
}

// 同チームのエリア建造物群が連結ネットワークを形成しているか
// placements には仮の新規配置を含めて渡す。
//
// アプローチ：
// 1. 全ノードの「有効セル」（自チームが所有するセル）をまとめてセットに収集し、
//    各セルがどのノードに属するかをマッピングする
// 2. 有効セル全体のグラフ上でBFSを行い、root(HQ)から到達可能なノードを探す
// 3. これにより「敵エリアを迂回しないと繋がらない」ケースを正確に検出できる
export function isAllianceNetworkConnected(
  teamId: string,
  placements: Placement[],
  defs: Record<string, { areaRadius?: number; cellSpan: number }>
): boolean {
  const nodes = placements.filter(
    p => p.teamId === teamId && (p.type === 'alliance_hq' || p.type === 'flag')
  )
  if (nodes.length === 0) return false
  const rootIndex = nodes.findIndex(p => p.type === 'alliance_hq')
  if (rootIndex === -1) return false

  // 敵チームのエリア矩形が「先置き優先」で所有するセルを壁として収集
  // 自チームより先に置かれた敵エリアは通路を遮断する
  const allAreaBuildings = placements.filter(p => p.teamId !== '' && (p.type === 'alliance_hq' || p.type === 'flag'))
  const enemyAreaCells = new Set<string>()
  for (const p of allAreaBuildings) {
    if (p.teamId === teamId) continue
    const def = defs[p.type]
    if (!def.areaRadius) continue
    const area = getAllianceArea(p, def.cellSpan, def.areaRadius)
    for (let r = area.rowMin; r < area.rowMax; r++) {
      for (let c = area.colMin; c < area.colMax; c++) {
        // このセルの「先置き所有者」が敵チームの場合のみ壁
        const owner = getAreaOwnerAtCell(c, r, allAreaBuildings, defs)
        if (owner !== null && owner !== teamId) enemyAreaCells.add(`${c},${r}`)
      }
    }
  }

  // 全ノードの有効セルを収集し、セル→ノードインデックスのマップを作る
  // 有効セル = 自チームのノードエリア内 かつ 敵エリアセルでない
  const cellToNodes = new Map<string, Set<number>>()
  for (let ni = 0; ni < nodes.length; ni++) {
    const p = nodes[ni]
    const def = defs[p.type]
    const area = getAllianceArea(p, def.cellSpan, def.areaRadius!)
    for (let r = area.rowMin; r < area.rowMax; r++) {
      for (let c = area.colMin; c < area.colMax; c++) {
        const key = `${c},${r}`
        if (enemyAreaCells.has(key)) continue  // 敵エリアセルは通れない
        if (!cellToNodes.has(key)) cellToNodes.set(key, new Set())
        cellToNodes.get(key)!.add(ni)
      }
    }
  }

  // 有効セル全体のグラフ上でBFS：root HQのセルから出発し、
  // 8方向隣接する有効セルへ移動しながら到達ノードを記録
  const visitedNodes = new Set<number>([rootIndex])
  const visitedCells = new Set<string>()
  const queue: string[] = []

  // rootノードの有効セルをキューに追加
  for (const [key, nset] of cellToNodes) {
    if (nset.has(rootIndex)) {
      visitedCells.add(key)
      queue.push(key)
    }
  }

  while (queue.length > 0) {
    const key = queue.shift()!
    const [c, r] = key.split(',').map(Number)
    // 8方向の隣接セルを探索
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue
        const nkey = `${c + dc},${r + dr}`
        if (visitedCells.has(nkey)) continue
        const nset = cellToNodes.get(nkey)
        if (!nset) continue  // 有効セルでなければスキップ
        visitedCells.add(nkey)
        queue.push(nkey)
        for (const ni of nset) visitedNodes.add(ni)
      }
    }
  }

  return visitedNodes.size === nodes.length
}

// アイソメトリック変換定数
export const TILE_W = CELL_SIZE
export const TILE_H = CELL_SIZE / 2

export function toIso(col: number, row: number): { sx: number; sy: number } {
  return {
    sx: (col - row) * (TILE_W / 2),
    sy: (col + row) * (TILE_H / 2),
  }
}

export function fromIso(relX: number, relY: number): { col: number; row: number } {
  return {
    col: Math.floor((relX / (TILE_W / 2) + relY / (TILE_H / 2)) / 2),
    row: Math.floor((relY / (TILE_H / 2) - relX / (TILE_W / 2)) / 2),
  }
}
