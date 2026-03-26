import ReactECharts from 'echarts-for-react'
import { Box } from '@mui/material'
import { aaPassingRate } from '../utils/aa'

// 用于生成 A&A 理论曲线的密集粒径点（跨越粉体到骨料全范围）
const DENSE_SIEVES = [
  0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005,
  0.01, 0.02, 0.045, 0.075, 0.15, 0.3, 0.6,
  1.18, 2.36, 4.75, 9.5, 16, 19, 26.5, 31.5, 37.5,
]

export default function GradationChart({ fullerResult, aaResult }) {
  if (!fullerResult) {
    return (
      <Box
        sx={{
          height: 360,
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          backgroundColor: 'rgba(255,255,255,0.45)',
        }}
      />
    )
  }

  const { theoreticalCurve, blendedCurve } = fullerResult
  const q    = aaResult?.q    ?? 0.25
  const dMin = aaResult?.theoreticalCurve?.[0]?.d ?? 0.0001
  const dMax = theoreticalCurve[theoreticalCurve.length - 1]?.d ?? 26.5

  // Fuller 理论曲线（骨料范围，P 已是 %）
  const fullerData = theoreticalCurve.map(({ d, P }) => [d, P])

  // 实测混合曲线（来自 Fuller 骨架拟合）
  const blendedData = blendedCurve.map(({ d, P }) => [d, P])

  // A&A 理论曲线（全粒径范围，P × 100 → %）
  const aaData = DENSE_SIEVES
    .filter((d) => d <= dMax)
    .map((d) => [d, aaPassingRate(d, q, dMin, dMax) * 100])

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        params
          .map((p) => `${p.seriesName}：${Number(p.value[1]).toFixed(1)}%`)
          .join('<br/>'),
    },
    legend: {
      data: ['Fuller 理论', 'A&A 理论', '实测混合'],
      bottom: 0,
    },
    grid: { left: 60, right: 20, top: 20, bottom: 50 },
    xAxis: {
      type: 'log',
      name: '粒径 (mm)',
      nameLocation: 'middle',
      nameGap: 30,
      min: 0.0001,
      max: 40,
      axisLabel: {
        formatter: (v) => {
          if (v >= 1) return `${v}`
          if (v >= 0.01) return `${v}`
          return `${v}`
        },
      },
    },
    yAxis: {
      type: 'value',
      name: '累计通过率 (%)',
      min: 0,
      max: 100,
    },
    series: [
      {
        name: 'Fuller 理论',
        type: 'line',
        data: fullerData,
        lineStyle: { type: 'dashed', width: 2 },
        symbol: 'none',
        color: '#1976d2',
      },
      {
        name: 'A&A 理论',
        type: 'line',
        data: aaData,
        lineStyle: { type: 'dashed', width: 2 },
        symbol: 'none',
        color: '#ed6c02',
      },
      {
        name: '实测混合',
        type: 'line',
        data: blendedData,
        lineStyle: { width: 2.5 },
        symbol: 'circle',
        symbolSize: 5,
        color: '#2e7d32',
      },
    ],
  }

  return (
    <ReactECharts option={option} style={{ height: 360 }} />
  )
}
