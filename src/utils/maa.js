/**
 * MAA 强度预测模型（Multi-component Activity Analysis）
 *
 * 目标：预测不同龄期的抗压强度，并根据增强剂品牌和养护温度修正。
 * 公式：Strength(t) = C_base(t) + Σ(Kᵢ(t) × SCMᵢ)
 *
 * 输入：各粉体用量、增强剂品牌和养护温度、环境温度
 * 输出：2天、3天、28天预测强度（MPa）
 */

/**
 * 标准养护温度（20°C），温度修正的基准
 */
const REF_TEMP = 20;

/**
 * 各 SCM 在不同龄期的默认活性系数 Kᵢ（MPa·m³/kg）
 * 基于工程经验值，可通过实验反馈修正。
 *
 * 含义：每 kg 该 SCM 在龄期 t 时对强度的贡献（MPa）
 */
const DEFAULT_K = {
  cement: { 2: 0.060, 3: 0.075, 28: 0.180 }, // 水泥（基准）
  flyAsh: { 2: 0.000, 3: 0.005, 28: 0.060 }, // 粉煤灰（慢速火山灰）
  ggbs:   { 2: 0.015, 3: 0.025, 28: 0.100 }, // 矿渣粉（中速）
  sf:     { 2: 0.040, 3: 0.060, 28: 0.200 }, // 硅灰（高活性）
};

/**
 * 增强剂品牌对 K 系数的乘数修正
 * 不同品牌的增强剂对各龄期强度的激发效率不同。
 * 实际项目中应由实验数据标定；此处为默认经验值。
 */
const ADMIXTURE_MULTIPLIER = {
  none:     { 2: 1.00, 3: 1.00, 28: 1.00 },
  typeA:    { 2: 1.20, 3: 1.15, 28: 1.05 }, // 早强型
  typeB:    { 2: 1.05, 3: 1.08, 28: 1.15 }, // 后期增强型
  typeC:    { 2: 1.15, 3: 1.12, 28: 1.10 }, // 综合型
};

/**
 * 温度修正系数（基于等效龄期 / Arrhenius 简化）
 * 温度越高，早期强度发展越快；28天差异相对较小。
 * 修正公式：factor = 1 + α(t) × (T - T_ref)
 */
const TEMP_ALPHA = {
  2:  0.018, // 早期对温度最敏感
  3:  0.014,
  28: 0.005, // 28天温度影响已趋于稳定
};

/**
 * 计算温度修正系数
 * @param {number} age  - 龄期（天）
 * @param {number} temp - 养护温度（°C）
 * @returns {number}
 */
function tempFactor(age, temp) {
  const alpha = TEMP_ALPHA[age] ?? 0.005;
  return Math.max(0.5, 1 + alpha * (temp - REF_TEMP));
}

/**
 * MAA 强度预测主函数
 *
 * @param {object} params
 * @param {{
 *   cement:  number,   水泥用量（kg/m³）
 *   flyAsh?: number,   粉煤灰用量（kg/m³）
 *   ggbs?:   number,   矿渣粉用量（kg/m³）
 *   sf?:     number,   硅灰用量（kg/m³）
 * }} params.dosages                  - 各粉体用量（来自 A&A 输出）
 * @param {number}  [params.temp=20]  - 养护温度（°C）
 * @param {string}  [params.admixture='none'] - 增强剂品牌：'none' | 'typeA' | 'typeB' | 'typeC'
 * @param {object}  [params.kOverride]        - 自定义 K 系数（实验反馈修正后传入）
 *
 * @returns {{
 *   strength: { 2: number, 3: number, 28: number },  各龄期预测强度（MPa）
 *   C_base:   { 2: number, 3: number, 28: number },  水泥贡献
 *   scmBreakdown: {                                   各 SCM 贡献明细
 *     flyAsh: { 2: number, 3: number, 28: number },
 *     ggbs:   { 2: number, 3: number, 28: number },
 *     sf:     { 2: number, 3: number, 28: number },
 *   },
 *   kCoeffs: object,   实际使用的 K 系数（含修正）
 *   tempFactors: { 2: number, 3: number, 28: number }
 * }}
 */
export function maaStrengthPredict({
  dosages,
  temp = REF_TEMP,
  admixture = 'none',
  kOverride = null,
}) {
  if (!dosages?.cement || dosages.cement <= 0)
    throw new Error("水泥用量必须大于 0");
  if (!(admixture in ADMIXTURE_MULTIPLIER))
    throw new Error(`未知增强剂品牌: ${admixture}，可选值：${Object.keys(ADMIXTURE_MULTIPLIER).join(', ')}`);

  // 合并默认 K 与外部修正（深合并每个龄期）
  const kCoeffs = kOverride
    ? Object.fromEntries(
        Object.entries(DEFAULT_K).map(([mat, ages]) => [
          mat,
          Object.fromEntries(
            Object.entries(ages).map(([age, val]) => [
              age,
              kOverride[mat]?.[age] ?? val,
            ])
          ),
        ])
      )
    : DEFAULT_K;

  const AGES = [2, 3, 28];
  const mult = (age) => (ADMIXTURE_MULTIPLIER[admixture] ?? ADMIXTURE_MULTIPLIER.none)[age];
  const tf = (age) => tempFactor(age, temp);

  const cBase = Object.fromEntries(
    AGES.map((t) => [t, Math.round(kCoeffs.cement[t] * dosages.cement * mult(t) * tf(t) * 10) / 10])
  );

  const scmBreakdown = {
    flyAsh: Object.fromEntries(
      AGES.map((t) => [t, Math.round(kCoeffs.flyAsh[t] * (dosages.flyAsh ?? 0) * mult(t) * tf(t) * 10) / 10])
    ),
    ggbs: Object.fromEntries(
      AGES.map((t) => [t, Math.round(kCoeffs.ggbs[t] * (dosages.ggbs ?? 0) * mult(t) * tf(t) * 10) / 10])
    ),
    sf: Object.fromEntries(
      AGES.map((t) => [t, Math.round(kCoeffs.sf[t] * (dosages.sf ?? 0) * mult(t) * tf(t) * 10) / 10])
    ),
  };

  const strength = Object.fromEntries(
    AGES.map((t) => [
      t,
      Math.round(
        (cBase[t] +
          scmBreakdown.flyAsh[t] +
          scmBreakdown.ggbs[t] +
          scmBreakdown.sf[t]) *
          10
      ) / 10,
    ])
  );

  return {
    strength,
    C_base: cBase,
    scmBreakdown,
    kCoeffs,
    tempFactors: Object.fromEntries(AGES.map((t) => [t, Math.round(tf(t) * 1000) / 1000])),
  };
}

/**
 * 实验反馈修正（Feedback Loop）
 *
 * 根据实测强度反向修正 K 系数，提高后续预测准确性。
 * 采用比例缩放：K_new = K_old × (measured / predicted)
 *
 * @param {{
 *   measured: { 2?: number, 3?: number, 28?: number }  实测强度（MPa），未测的龄期可省略
 *   dosages:  object                                    与预测时相同的粉体用量
 *   temp:     number
 *   admixture: string
 *   kCurrent?: object                                   当前 K 系数（默认使用内置值）
 * }} params
 *
 * @returns {{ kAdjusted: object, corrections: object }}
 * kAdjusted  修正后的 K 系数，传回 maaStrengthPredict 的 kOverride
 * corrections 各龄期修正比例（measured/predicted），用于 UI 展示
 */
export function maaCalibrate({ measured, dosages, temp = REF_TEMP, admixture = 'none', kCurrent = null }) {
  const baseResult = maaStrengthPredict({ dosages, temp, admixture, kOverride: kCurrent });
  const { strength: predicted, kCoeffs } = baseResult;

  const corrections = {};
  const kAdjusted = JSON.parse(JSON.stringify(kCoeffs)); // 深拷贝

  for (const [ageStr, measuredVal] of Object.entries(measured)) {
    const age = Number(ageStr);
    if (!measuredVal || !predicted[age]) continue;

    const ratio = measuredVal / predicted[age];
    corrections[age] = Math.round(ratio * 1000) / 1000;

    // 按比例缩放该龄期所有材料的 K 系数
    for (const mat of ['cement', 'flyAsh', 'ggbs', 'sf']) {
      if (kAdjusted[mat]?.[age] !== undefined) {
        kAdjusted[mat][age] = Math.round(kAdjusted[mat][age] * ratio * 10000) / 10000;
      }
    }
  }

  return { kAdjusted, corrections };
}
