/**
 * 常用粉体材料的标准粒径分布数据（PSD）
 *
 * 粒径单位：mm（与骨料筛分数据统一）
 * 通过率 P：0~1
 *
 * 数据来源：工程经验值，基于典型中国市售材料
 */

// 粉体筛分节点（mm），覆盖 0.1μm ~ 75μm
export const POWDER_SIEVES = [0.0001, 0.0003, 0.001, 0.003, 0.01, 0.02, 0.045, 0.075]

/**
 * 各粉体标准 PSD
 * 密度单位：kg/m³
 */
export const STANDARD_POWDER_PSD = {
  cement: {
    name: '水泥',
    density: 3150,
    psd: [
      { d: 0.0001, P: 0 },
      { d: 0.0003, P: 0.01 },
      { d: 0.001,  P: 0.04 },
      { d: 0.003,  P: 0.12 },
      { d: 0.01,   P: 0.35 },
      { d: 0.02,   P: 0.65 },
      { d: 0.045,  P: 0.92 },
      { d: 0.075,  P: 1.00 },
    ],
  },

  flyAsh: {
    name: '粉煤灰',
    density: 2300,
    psd: [
      { d: 0.0001, P: 0 },
      { d: 0.0003, P: 0.005 },
      { d: 0.001,  P: 0.02 },
      { d: 0.003,  P: 0.08 },
      { d: 0.01,   P: 0.28 },
      { d: 0.02,   P: 0.55 },
      { d: 0.045,  P: 0.88 },
      { d: 0.075,  P: 1.00 },
    ],
  },

  ggbs: {
    name: '矿渣粉',
    density: 2900,
    psd: [
      { d: 0.0001, P: 0 },
      { d: 0.0003, P: 0.02 },
      { d: 0.001,  P: 0.06 },
      { d: 0.003,  P: 0.18 },
      { d: 0.01,   P: 0.45 },
      { d: 0.02,   P: 0.75 },
      { d: 0.045,  P: 0.96 },
      { d: 0.075,  P: 1.00 },
    ],
  },

  sf: {
    name: '硅灰',
    density: 2200,
    psd: [
      { d: 0.0001, P: 0.10 },
      { d: 0.0003, P: 0.65 },
      { d: 0.001,  P: 0.95 },
      { d: 0.003,  P: 1.00 },
      { d: 0.01,   P: 1.00 },
      { d: 0.02,   P: 1.00 },
      { d: 0.045,  P: 1.00 },
      { d: 0.075,  P: 1.00 },
    ],
  },
}

/**
 * 根据用户选择的粉体类型，构建传入 aaFilling 的 powders 数组
 * @param {string[]} selected - 选中的粉体 key，如 ['cement', 'flyAsh']
 * @returns {{ name, density, psd }[]}
 */
export function buildPowderList(selected) {
  return selected
    .filter((key) => key in STANDARD_POWDER_PSD)
    .map((key) => STANDARD_POWDER_PSD[key])
}
