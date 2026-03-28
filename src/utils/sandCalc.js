/**
 * 砂的细度模数计算与多砂混合（GB/T 14684）
 */

// 细度模数标准筛（mm），从大到小
export const FM_SIEVES = [4.75, 2.36, 1.18, 0.6, 0.3, 0.15]

// 石子标准筛（mm），从小到大
export const STONE_SIEVES = [4.75, 9.5, 16, 19, 26.5, 31.5, 37.5]

/**
 * 计算单种砂的细度模数
 * @param {Object} retained - 分计筛余，{ 4.75: %, 2.36: %, ... }
 * @returns {number} 细度模数 FM
 */
export function calcFinenessModulus(retained) {
  let cumRetained = 0
  let FM = 0
  for (const d of FM_SIEVES) {
    cumRetained += Number(retained[d] ?? 0)
    FM += cumRetained
  }
  return Math.round((FM / 100) * 100) / 100
}

/**
 * 分计筛余 → 累计通过率（%）（供 Fuller 使用）
 * @param {Object} retained - { 4.75: %, 2.36: %, ... }
 * @returns {{ d: number, P: number }[]}
 */
export function retainedToPassing(retained) {
  let cumRetained = 0
  return FM_SIEVES.map((d) => {
    cumRetained += Number(retained[d] ?? 0)
    return { d, P: Math.max(0, 100 - cumRetained) }
  })
}

/**
 * 多砂按比例混合得到综合 PSD（累计通过率）
 * @param {{ ratio: number, retained: Object }[]} sands - 启用的砂列表
 * @returns {{ d: number, P: number }[]}
 */
export function blendSandPSDs(sands) {
  const totalRatio = sands.reduce((s, sd) => s + Number(sd.ratio), 0)
  if (totalRatio === 0) return FM_SIEVES.map((d) => ({ d, P: 0 }))

  const passingArrays = sands.map((sd) => retainedToPassing(sd.retained))

  return FM_SIEVES.map((d, i) => ({
    d,
    P: sands.reduce((sum, sd, j) => sum + (passingArrays[j][i]?.P ?? 0) * (Number(sd.ratio) / totalRatio), 0),
  }))
}

/**
 * 按比例加权平均一个数值属性（moisture、powderContent 等）
 * @param {{ ratio: number, [key]: number }[]} sands
 * @param {string} key
 * @returns {number}
 */
export function blendSandProp(sands, key) {
  const totalRatio = sands.reduce((s, sd) => s + Number(sd.ratio), 0)
  if (totalRatio === 0) return 0
  return (
    sands.reduce((sum, sd) => sum + Number(sd[key] ?? 0) * Number(sd.ratio), 0) / totalRatio
  )
}
