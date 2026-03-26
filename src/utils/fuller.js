/**
 * Fuller 骨架优化模型
 *
 * 目标：计算砂石的最优比例，使堆积密度最大、空隙率最低。
 * 公式：P(d) = 100 × √(d / D_max)
 *
 * 输入：各级骨料的筛分数据数组（粒径 + 通过率）、最大粒径 D_max
 * 输出：最优砂率、理论级配曲线
 */

/**
 * 计算 Fuller 理论通过率
 * @param {number} d - 当前粒径（mm）
 * @param {number} dMax - 最大粒径（mm）
 * @returns {number} 累计通过百分比（%）
 */
export function fullerPassingRate(d, dMax) {
  if (dMax <= 0) throw new Error("D_max 必须大于 0");
  if (d <= 0) return 0;
  if (d >= dMax) return 100;
  return 100 * Math.sqrt(d / dMax);
}

/**
 * 生成 Fuller 理论级配曲线（用于图表绘制）
 * @param {number} dMax - 最大粒径（mm）
 * @param {number[]} sieves - 筛孔粒径数组（mm），如 [0.075, 0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 9.5, 19, 26.5]
 * @returns {{ d: number, P: number }[]} 理论级配曲线数组
 */
export function fullerCurve(dMax, sieves) {
  return sieves.map((d) => ({
    d,
    P: fullerPassingRate(d, dMax),
  }));
}

/**
 * 混合级配通过率：按砂率加权混合砂和石的实测筛分数据
 * @param {number} sandRatio - 砂率（0~1）
 * @param {{ d: number, P: number }[]} sandPSD - 砂的筛分数据
 * @param {{ d: number, P: number }[]} stonePSD - 石的筛分数据
 * @returns {{ d: number, P: number }[]} 混合后的级配曲线
 */
function blendedCurve(sandRatio, sandPSD, stonePSD) {
  // 两组数据需要在相同粒径节点上，取砂的粒径列表为基准
  return sandPSD.map((point, i) => ({
    d: point.d,
    P: sandRatio * point.P + (1 - sandRatio) * (stonePSD[i]?.P ?? 0),
  }));
}

/**
 * 计算实测混合曲线与 Fuller 理论曲线的残差平方和（RSS）
 * @param {number} sandRatio - 砂率（0~1）
 * @param {{ d: number, P: number }[]} sandPSD - 砂的筛分数据
 * @param {{ d: number, P: number }[]} stonePSD - 石的筛分数据
 * @param {number} dMax - 最大粒径（mm）
 * @returns {number} RSS
 */
function residualSumOfSquares(sandRatio, sandPSD, stonePSD, dMax) {
  const blended = blendedCurve(sandRatio, sandPSD, stonePSD);
  return blended.reduce((sum, { d, P }) => {
    const theoretical = fullerPassingRate(d, dMax);
    return sum + (P - theoretical) ** 2;
  }, 0);
}

/**
 * 黄金分割搜索，在区间 [lo, hi] 内找使 f(x) 最小的 x
 */
function goldenSectionSearch(f, lo, hi, tol = 1e-6) {
  const phi = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  let c = b - phi * (b - a);
  let d = a + phi * (b - a);

  while (Math.abs(b - a) > tol) {
    if (f(c) < f(d)) {
      b = d;
    } else {
      a = c;
    }
    c = b - phi * (b - a);
    d = a + phi * (b - a);
  }
  return (a + b) / 2;
}

/**
 * Fuller 骨架优化主函数
 *
 * 通过最小化实测混合级配曲线与 Fuller 理论曲线的残差平方和，
 * 求解最优砂率。
 *
 * @param {object} params
 * @param {{ d: number, P: number }[]} params.sandPSD   - 砂的筛分数据，P 为通过百分比（%）
 * @param {{ d: number, P: number }[]} params.stonePSD  - 石的筛分数据，P 为通过百分比（%）
 * @param {number} params.dMax                          - 最大粒径（mm）
 * @param {number} [params.sandRatioMin=0.25]           - 砂率搜索下限
 * @param {number} [params.sandRatioMax=0.55]           - 砂率搜索上限
 *
 * @returns {{
 *   optimalSandRatio: number,       // 最优砂率（0~1）
 *   theoreticalCurve: { d: number, P: number }[],  // Fuller 理论曲线
 *   blendedCurve: { d: number, P: number }[],      // 最优混合曲线（用于图表）
 *   rss: number                     // 残差平方和（越小越好）
 * }}
 */
export function fullerOptimization({ sandPSD, stonePSD, dMax, sandRatioMin = 0.25, sandRatioMax = 0.55 }) {
  if (!sandPSD?.length || !stonePSD?.length) throw new Error("砂和石的筛分数据不能为空");
  if (sandPSD.length !== stonePSD.length) throw new Error("砂和石的筛分数据节点数必须一致");
  if (dMax <= 0) throw new Error("D_max 必须大于 0");

  const f = (ratio) => residualSumOfSquares(ratio, sandPSD, stonePSD, dMax);
  const optimalSandRatio = goldenSectionSearch(f, sandRatioMin, sandRatioMax);

  const sieves = sandPSD.map((p) => p.d);

  return {
    optimalSandRatio: Math.round(optimalSandRatio * 1000) / 1000,
    theoreticalCurve: fullerCurve(dMax, sieves),
    blendedCurve: blendedCurve(optimalSandRatio, sandPSD, stonePSD),
    rss: f(optimalSandRatio),
  };
}
