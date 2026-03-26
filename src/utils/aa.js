/**
 * A&A 浆体填充模型（Andreasen & Andersen）
 *
 * 目标：计算粉体（水泥、粉煤灰、石粉等）填充骨架空隙的需求量。
 * 公式：P(d) = (d^q - d_min^q) / (D_max^q - d_min^q)
 *
 * 输入：Fuller 骨架结果、q 值（默认 0.25）、各粉体粒径参数
 * 输出：各粉体用量（kg/m³）、理论 A&A 曲线
 */

// q 值有效范围
const Q_MIN = 0.22;
const Q_MAX = 0.36;
const Q_DEFAULT = 0.25;

/**
 * 计算 A&A 理论通过率（单点）
 * @param {number} d     - 当前粒径（mm）
 * @param {number} q     - 分布模数（0.22~0.36）
 * @param {number} dMin  - 最小粒径（mm）
 * @param {number} dMax  - 最大粒径（mm）
 * @returns {number} 累计通过率（0~1）
 */
export function aaPassingRate(d, q, dMin, dMax) {
  if (d <= dMin) return 0;
  if (d >= dMax) return 1;
  return (d ** q - dMin ** q) / (dMax ** q - dMin ** q);
}

/**
 * 生成 A&A 理论级配曲线（用于图表绘制）
 * @param {number}   q      - 分布模数
 * @param {number}   dMin   - 最小粒径（mm）
 * @param {number}   dMax   - 最大粒径（mm）
 * @param {number[]} sieves - 筛孔粒径数组（mm）
 * @returns {{ d: number, P: number }[]} 理论曲线（P 为 0~1）
 */
export function aaCurve(q, dMin, dMax, sieves) {
  return sieves.map((d) => ({
    d,
    P: aaPassingRate(d, q, dMin, dMax),
  }));
}

/**
 * 计算混合粉体曲线与 A&A 理论曲线的残差平方和
 * @param {number[]} ratios  - 各粉体的体积比例（归一化后之和为 1）
 * @param {{ psd: { d: number, P: number }[] }[]} powders - 各粉体筛分数据
 * @param {number} q
 * @param {number} dMin
 * @param {number} dMax
 * @returns {number}
 */
function powderRSS(ratios, powders, q, dMin, dMax) {
  const sieves = powders[0].psd.map((p) => p.d);
  return sieves.reduce((sum, d, i) => {
    const blended = ratios.reduce(
      (acc, r, j) => acc + r * (powders[j].psd[i]?.P ?? 0),
      0
    );
    const theoretical = aaPassingRate(d, q, dMin, dMax);
    return sum + (blended - theoretical) ** 2;
  }, 0);
}

/**
 * 用坐标下降法在约束（各比例之和=1）下最小化 RSS
 * 每轮固定其余比例，对一个维度做黄金分割搜索，循环迭代直到收敛。
 */
function optimizePowderRatios(powders, q, dMin, dMax, maxIter = 200) {
  const n = powders.length;
  // 初始均匀分配
  let ratios = Array(n).fill(1 / n);

  const phi = (Math.sqrt(5) - 1) / 2;

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let k = 0; k < n; k++) {
      // 固定其余维度，搜索第 k 个比例
      const rest = ratios.reduce((s, r, j) => (j === k ? s : s + r), 0);
      // 第 k 个比例范围：[0, 1 - rest]
      const lo = 0;
      const hi = 1 - rest;
      if (hi <= lo + 1e-9) continue;

      let a = lo, b = hi;
      let c = b - phi * (b - a);
      let dd = a + phi * (b - a);

      const f = (rk) => {
        const r = [...ratios];
        r[k] = rk;
        // 重新归一化
        const total = r.reduce((s, v) => s + v, 0);
        const rNorm = r.map((v) => v / total);
        return powderRSS(rNorm, powders, q, dMin, dMax);
      };

      for (let s = 0; s < 60 && Math.abs(b - a) > 1e-8; s++) {
        if (f(c) < f(dd)) { b = dd; } else { a = c; }
        c = b - phi * (b - a);
        dd = a + phi * (b - a);
      }

      const best = (a + b) / 2;
      if (Math.abs(best - ratios[k]) > 1e-6) changed = true;
      ratios[k] = best;
    }
    // 归一化
    const total = ratios.reduce((s, r) => s + r, 0);
    ratios = ratios.map((r) => r / total);
    if (!changed) break;
  }
  return ratios;
}

/**
 * A&A 浆体填充主函数
 *
 * 工作流程：
 * 1. 根据骨架空隙率计算需填充的浆体体积（m³/m³）
 * 2. 按 A&A 曲线优化各粉体比例，使混合粉体级配贴近理论曲线
 * 3. 根据各粉体密度换算为用量（kg/m³）
 *
 * @param {object} params
 * @param {number}   params.skeletonVoidRatio  - 骨架空隙率（0~1），来自 Fuller 结果
 * @param {number}   params.dMax               - 最大粒径（mm），与 Fuller 一致
 * @param {number}   [params.q=0.25]           - 分布模数（0.22~0.36）
 * @param {number}   [params.excessPasteRatio=0.08] - 超填系数：包裹骨料表面的额外浆体比例
 * @param {{
 *   name: string,
 *   density: number,              单位密度（kg/m³），水泥≈3150，粉煤灰≈2300，矿粉≈2900
 *   psd: { d: number, P: number }[] 筛分数据，P 为通过率（0~1）
 * }[]} params.powders             - 各粉体材料列表
 *
 * @returns {{
 *   pasteVolume: number,          浆体总体积（m³/m³ 混凝土）
 *   powderRatios: number[],       各粉体的体积比例（归一化，之和=1）
 *   dosages: { name: string, volumeFraction: number, kg: number }[],  各粉体用量
 *   theoreticalCurve: { d: number, P: number }[],  A&A 理论曲线
 *   blendedCurve:     { d: number, P: number }[],  混合粉体实际曲线
 *   rss: number,                  残差平方和
 *   q: number                     实际使用的 q 值
 * }}
 */
export function aaFilling({
  skeletonVoidRatio,
  dMax,
  q = Q_DEFAULT,
  excessPasteRatio = 0.08,
  powders,
}) {
  if (!powders?.length) throw new Error("粉体列表不能为空");
  if (skeletonVoidRatio <= 0 || skeletonVoidRatio >= 1)
    throw new Error("骨架空隙率必须在 0~1 之间");
  if (q < Q_MIN || q > Q_MAX)
    throw new Error(`q 值必须在 ${Q_MIN}~${Q_MAX} 之间`);

  // 最小粒径取所有粉体 psd 中最小的 d 值
  const dMin = Math.min(...powders.map((p) => p.psd[0]?.d ?? 0.001));
  if (dMin <= 0) throw new Error("粉体最小粒径必须大于 0");

  // 浆体体积 = 骨架空隙 + 超填
  const pasteVolume = skeletonVoidRatio + excessPasteRatio;

  // 优化各粉体体积比例
  const powderRatios = optimizePowderRatios(powders, q, dMin, dMax);

  // 各粉体用量（kg/m³ 混凝土）
  const dosages = powders.map((p, i) => {
    const volumeFraction = powderRatios[i] * pasteVolume; // m³/m³
    const kg = Math.round(volumeFraction * p.density * 10) / 10;
    return { name: p.name, volumeFraction, kg };
  });

  // 生成曲线（供图表使用）
  const sieves = powders[0].psd.map((p) => p.d);
  const theoreticalCurve = aaCurve(q, dMin, dMax, sieves);
  const blendedCurve = sieves.map((d, i) => ({
    d,
    P: powderRatios.reduce((acc, r, j) => acc + r * (powders[j].psd[i]?.P ?? 0), 0),
  }));

  return {
    pasteVolume: Math.round(pasteVolume * 1000) / 1000,
    powderRatios: powderRatios.map((r) => Math.round(r * 1000) / 1000),
    dosages,
    theoreticalCurve,
    blendedCurve,
    rss: powderRSS(powderRatios, powders, q, dMin, dMax),
    q,
  };
}
