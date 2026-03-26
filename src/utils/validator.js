/**
 * 安全约束校验（Safety Validator）
 *
 * 硬性限制（违反则阻止输出并告警）：
 *   - 水胶比 W/B ≤ 用户设定上限（默认 0.38）
 *   - 水泥用量 ≥ 80 kg/m³
 *   - 总粉体用量 ≥ 450 kg/m³
 */

/**
 * @param {object} params
 * @param {number} params.water              - 用水量（kg/m³）
 * @param {number} params.cementDosage       - 水泥用量（kg/m³）
 * @param {number} params.totalPowder        - 总粉体用量（kg/m³，含水泥）
 * @param {number} [params.wbLimit=0.38]     - 水胶比上限
 *
 * @returns {{
 *   valid: boolean,
 *   waterBinderRatio: number,
 *   alerts: { field: string, message: string, severity: 'error'|'warning' }[]
 * }}
 */
export function validateMix({ water, cementDosage, totalPowder, wbLimit = 0.38 }) {
  const alerts = []
  const waterBinderRatio = totalPowder > 0 ? Math.round((water / totalPowder) * 1000) / 1000 : Infinity

  if (waterBinderRatio > wbLimit) {
    alerts.push({
      field: 'waterBinderRatio',
      severity: 'error',
      message: `水胶比 ${waterBinderRatio} 超过上限 ${wbLimit}，禁止生成配比。`,
    })
  }

  if (cementDosage < 80) {
    alerts.push({
      field: 'cement',
      severity: 'warning',
      message: `水泥用量 ${cementDosage} kg/m³ 低于最小值 80 kg/m³。`,
    })
  }

  if (totalPowder < 450) {
    alerts.push({
      field: 'totalPowder',
      severity: 'warning',
      message: `总粉体用量 ${totalPowder} kg/m³ 低于 450 kg/m³，存在离析防冻等风险。`,
    })
  }

  const hasError = alerts.some((a) => a.severity === 'error')

  return { valid: !hasError, waterBinderRatio, alerts }
}
