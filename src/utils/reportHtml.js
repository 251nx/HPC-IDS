/**
 * 生成可打印 HTML 配合比设计报告
 */

const POWDER_NAMES = { cement: '水泥', flyAsh: '粉煤灰', ggbs: '矿渣粉', sf: '硅灰' }

function v(x, unit = '') {
  if (x == null || x === '') return '—'
  return unit ? `${x} ${unit}` : `${x}`
}

function pct(ratio) {
  if (ratio == null) return '—'
  return `${Math.round(ratio * 1000) / 10}%`
}

export function buildReportHtml({ stepA, stepB, stepC, stepD, stepE, chartImageUrl, exportedAt }) {
  const dosages     = stepC?.dosages ?? {}
  const totalBinder = Math.round(Object.values(dosages).reduce((s, x) => s + (x ?? 0), 0)) || null
  const wb          = stepD?.designWater && totalBinder
    ? Math.round(stepD.designWater / totalBinder * 1000) / 1000
    : null

  /* ── Powder rows ── */
  const powderRows = Object.entries(dosages)
    .filter(([, x]) => x > 0)
    .map(([k, x]) => `<tr><td>${POWDER_NAMES[k] ?? k}</td><td class="r">${Math.round(x)}</td></tr>`)
    .join('') || '<tr><td colspan="2">（未录入）</td></tr>'

  /* ── Strength breakdown rows ── */
  let strRows = ''
  const s = stepE
  if (s?.cBase && s?.scmBreakdown) {
    strRows += row4('水泥', s.cBase[2], s.cBase[3], s.cBase[28])
    Object.entries(s.scmBreakdown).forEach(([k, ages]) => {
      if ((dosages[k] ?? 0) > 0)
        strRows += row4(POWDER_NAMES[k], ages[2], ages[3], ages[28])
    })
    strRows += `<tr class="total"><td>合计（预测）</td><td class="r">${s.strength?.[2]??'—'}</td><td class="r">${s.strength?.[3]??'—'}</td><td class="r ${s.pass?'pass':'fail'}">${s.strength?.[28]??'—'}</td></tr>`
    strRows += `<tr class="dim"><td>目标 f<sub>cu,0</sub></td><td class="r" colspan="2">—</td><td class="r">${s.target??'—'}</td></tr>`
  } else if (s?.strength) {
    strRows += `<tr class="total"><td>预测（合计）</td><td class="r">${s.strength[2]}</td><td class="r">${s.strength[3]}</td><td class="r ${s.pass?'pass':'fail'}">${s.strength[28]}</td></tr>`
    strRows += `<tr class="dim"><td>目标</td><td class="r" colspan="2">—</td><td class="r">${s.target??'—'}</td></tr>`
  } else {
    strRows = '<tr><td colspan="4">（未完成强度预测）</td></tr>'
  }

  /* ── Safety checks ── */
  const checks = stepE?.checks ?? {}
  const checkRows = Object.values(checks).length
    ? Object.values(checks).map(c =>
        `<tr><td>${c.label}</td><td>${c.value}</td><td class="${c.pass?'pass':'fail'}">${c.pass?'✓ 满足':'✗ 不满足'}</td></tr>`
      ).join('')
    : '<tr><td colspan="3">（未完成安全约束检查）</td></tr>'

  const verdict = s
    ? s.pass
      ? `<span class="pass">✓ 满足：28d 预测 ${s.strength?.[28]} MPa ≥ 目标 ${s.target} MPa</span>`
      : `<span class="fail">✗ 不满足：28d 预测 ${s.strength?.[28]} MPa &lt; 目标 ${s.target} MPa，请调整配比</span>`
    : '（未完成强度预测）'

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>RG-HPCMIDS 配合比报告${s?.grade ? ' — ' + s.grade : ''}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;font-size:12px;color:#1a1a1a;padding:20px 28px;line-height:1.6}
.hdr{border-bottom:3px solid #1565c0;padding-bottom:10px;margin-bottom:16px}
.hdr h1{font-size:18px;color:#1565c0;display:flex;align-items:center;gap:10px}
.badge{background:#1565c0;color:#fff;padding:2px 12px;border-radius:12px;font-size:14px;font-weight:700}
.meta{color:#666;font-size:11px;margin-top:4px}
h2{font-size:12px;font-weight:700;color:#1565c0;border-left:3px solid #1565c0;padding-left:7px;margin:16px 0 6px}
table{border-collapse:collapse;width:100%;margin-bottom:10px;font-size:11.5px}
th,td{border:1px solid #c8c8c8;padding:4px 9px}
th{background:#e3f2fd;font-weight:600;text-align:left}
tr:nth-child(even) td{background:#fafafa}
.r{text-align:right}
.total td{font-weight:700;background:#e8f5e9!important}
.dim td{color:#777;font-style:italic}
.pass{color:#2e7d32;font-weight:600}
.fail{color:#c62828;font-weight:600}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.verdict{padding:6px 10px;background:#f5f5f5;border-radius:4px;margin:6px 0 10px;font-size:12px}
.chart-img{max-width:100%;display:block;border:1px solid #ddd;border-radius:4px;margin-top:6px}
.footer{margin-top:20px;border-top:1px solid #ddd;padding-top:8px;font-size:10px;color:#999}
.print-btn{position:fixed;top:14px;right:18px;background:#1565c0;color:#fff;border:none;padding:6px 18px;border-radius:4px;cursor:pointer;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.25)}
@media print{
  .print-btn{display:none}
  body{padding:0}
  @page{margin:1.5cm;size:A4}
}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">打印 / 另存为 PDF</button>

<div class="hdr">
  <h1>RG-HPCMIDS 瑞高低碳高性能复合材料配合比设计报告
    ${s?.grade ? `<span class="badge">${s.grade}</span>` : ''}
  </h1>
  <div class="meta">生成时间：${exportedAt}&nbsp;&nbsp;|&nbsp;&nbsp;RG-HPCMIDS Intelligent Design System v1.0</div>
</div>

<div class="two">
<div>
<h2>设计参数</h2>
<table>
  <tr><th>参数</th><th>数值</th></tr>
  <tr><td>混凝土标号</td><td>${s?.grade ?? '—'}</td></tr>
  <tr><td>配制强度 f<sub>cu,0</sub></td><td class="r">${v(s?.target,'MPa')}</td></tr>
  <tr><td>最大粒径 D<sub>max</sub></td><td class="r">${v(stepA?.dMax,'mm')}</td></tr>
  <tr><td>细度模数 FM</td><td class="r">${v(stepB?.fm)}</td></tr>
  <tr><td>最优砂率</td><td class="r">${pct(stepB?.optimalSandRatio)}</td></tr>
  <tr><td>分布模数 q</td><td class="r">${v(stepC?.q)}</td></tr>
  <tr><td class="${wb!=null?(wb<=0.38?'pass':'fail'):''}">水胶比 W/B</td><td class="r ${wb!=null?(wb<=0.38?'pass':'fail'):''}">${v(wb)}</td></tr>
</table>
</div>

<div>
<h2>配合比 (kg/m³)</h2>
<table>
  <tr><th>材料</th><th class="r">用量 (kg/m³)</th></tr>
  ${powderRows}
  <tr class="total"><td>总胶凝材料</td><td class="r">${totalBinder ?? '—'}</td></tr>
  <tr><td>砂（干料）</td><td class="r">${v(stepC?.sandDryMass)}</td></tr>
  <tr><td>石子（干料）</td><td class="r">${v(stepC?.stoneDryMass)}</td></tr>
  <tr><td>砂（投料·含水）</td><td class="r">${v(stepD?.sand?.actualMass)}</td></tr>
  <tr><td>石子（投料·含水）</td><td class="r">${v(stepD?.stone?.actualMass)}</td></tr>
  <tr><td>设计用水量</td><td class="r">${v(stepD?.designWater)}</td></tr>
  <tr class="total"><td>实际加水量</td><td class="r">${v(stepD?.actualWater)}</td></tr>
</table>
</div>
</div>

<h2>强度预测 (MAA) — MPa</h2>
<table>
  <tr><th>材料</th><th class="r">2d</th><th class="r">3d</th><th class="r">28d</th></tr>
  ${strRows}
</table>
<div class="verdict">${verdict}</div>

<h2>安全约束检查</h2>
<table>
  <tr><th>约束条件</th><th>实际值</th><th>判定</th></tr>
  ${checkRows}
</table>

${chartImageUrl ? `<h2>级配曲线图</h2>
<img class="chart-img" src="${chartImageUrl}" alt="级配曲线">` : ''}

<div class="footer">
  本报告由 RG-HPCMIDS 瑞高低碳高性能复合材料智能设计系统自动生成，仅供参考。实际施工配比须经实验室验证后方可使用。
</div>
</body>
</html>`
}

function row4(label, v2, v3, v28) {
  return `<tr><td>${label}</td><td class="r">${v2??'—'}</td><td class="r">${v3??'—'}</td><td class="r">${v28??'—'}</td></tr>`
}
