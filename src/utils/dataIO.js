/**
 * JSON 导入 / 导出工具
 */

const VERSION = '1.0'

/**
 * 触发浏览器下载 JSON 文件
 */
export function downloadJSON(data, filename = 'hpc-mix-design.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 构建导出数据包
 */
export function buildExportPayload({ stepA, stepB, stepC, stepD, stepE }) {
  return {
    version:    VERSION,
    exportedAt: new Date().toISOString(),
    results: { stepA, stepB, stepC, stepD, stepE },
  }
}

/**
 * 解析导入文件，返回 { stepA, stepB, stepC, stepD, stepE }
 * 抛出含中文描述的 Error 供界面展示
 */
export function parseImportPayload(jsonText) {
  let data
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('文件格式错误：无法解析 JSON')
  }
  if (!data.version) throw new Error('文件格式错误：缺少 version 字段')
  if (data.version !== VERSION) throw new Error(`不支持的版本：${data.version}（当前版本 ${VERSION}）`)
  if (!data.results)  throw new Error('文件格式错误：缺少 results 字段')
  return data.results
}
