/**
 * 含水率自动修正（Moisture Adapter）
 *
 * 骨料含水会影响实际用水量，需要修正投料量和加水量。
 *
 * 公式：
 *   实际投料量 = 设计干料量 / (1 - 含水率)
 *   实际加水量 = 设计水量 - 骨料自带水量
 */

/**
 * 计算单种骨料的修正结果
 * @param {number} dryMass   - 设计干料量（kg/m³）
 * @param {number} moisture  - 含水率（%，如 3 表示 3%）
 * @returns {{ actualMass: number, waterCarried: number }}
 */
export function correctMaterial(dryMass, moisture) {
  const m = moisture / 100
  const actualMass = dryMass / (1 - m)
  const waterCarried = actualMass - dryMass
  return {
    actualMass: Math.round(actualMass * 10) / 10,
    waterCarried: Math.round(waterCarried * 10) / 10,
  }
}

/**
 * 含水率修正主函数
 *
 * @param {object} params
 * @param {number} params.designWater      - 设计加水量（kg/m³）
 * @param {number} params.sandDryMass      - 砂设计干料量（kg/m³）
 * @param {number} params.sandMoisture     - 砂含水率（%）
 * @param {number} params.stoneDryMass     - 石设计干料量（kg/m³）
 * @param {number} params.stoneMoisture    - 石含水率（%）
 *
 * @returns {{
 *   sand:  { actualMass: number, waterCarried: number },
 *   stone: { actualMass: number, waterCarried: number },
 *   actualWater: number,   实际加水量（kg/m³）
 *   totalWaterCarried: number
 * }}
 */
export function correctMoisture({ designWater, sandDryMass, sandMoisture, stoneDryMass, stoneMoisture }) {
  const sand  = correctMaterial(sandDryMass, sandMoisture)
  const stone = correctMaterial(stoneDryMass, stoneMoisture)
  const totalWaterCarried = sand.waterCarried + stone.waterCarried
  const actualWater = Math.round((designWater - totalWaterCarried) * 10) / 10

  return { sand, stone, actualWater, totalWaterCarried: Math.round(totalWaterCarried * 10) / 10 }
}
