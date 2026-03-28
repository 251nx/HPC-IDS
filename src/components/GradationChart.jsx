import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import ReactECharts from 'echarts-for-react'
import { Box, FormControlLabel, Checkbox, Typography, Stack } from '@mui/material'

/**
 * GradationChart
 * @param {Array}  series — [{ name, data:[{d,P}], color?, dashed? }]  P in %
 * @param {Ref}    ref    — exposes { getChartImage() } for report export
 */
const GradationChart = forwardRef(function GradationChart({ series = [] }, ref) {
  const echartsRef = useRef(null)
  const [visible, setVisible] = useState({})

  // Expose chart PNG data URL for report generation
  useImperativeHandle(ref, () => ({
    getChartImage() {
      const inst = echartsRef.current?.getEchartsInstance?.()
      if (!inst) return null
      return inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    },
  }))

  const seriesKey = series.map(s => s.name).join('|')
  useEffect(() => {
    setVisible(prev => {
      const next = { ...prev }
      // Add new series as visible; remove stale keys
      const names = new Set(series.map(s => s.name))
      Object.keys(next).forEach(k => { if (!names.has(k)) delete next[k] })
      series.forEach(s => { if (!(s.name in next)) next[s.name] = true })
      return next
    })
  }, [seriesKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (name) => setVisible(prev => ({ ...prev, [name]: !prev[name] }))

  if (series.length === 0) {
    return (
      <Box sx={{
        height: 380, borderRadius: 2, border: '1px dashed', borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'text.disabled', fontSize: 13, bgcolor: 'rgba(255,255,255,0.45)',
      }}>
        完成步骤 A 后显示级配曲线
      </Box>
    )
  }

  // Only pass visible series to ECharts — notMerge ensures removed series disappear
  const activeSeries = series.filter(s => visible[s.name] !== false)

  // Compute X-axis range from actual data so the chart always fills the view
  const allD = series.flatMap(s => s.data.map(p => p.d)).filter(d => d > 0)
  const rawMin = allD.length ? Math.min(...allD) : 0.05
  const rawMax = allD.length ? Math.max(...allD) : 75
  // Pad by half a decade on each side so data points aren't clipped at edges
  const xMin = Math.pow(10, Math.floor(Math.log10(rawMin) * 10 - 4) / 10)
  const xMax = Math.pow(10, Math.ceil(Math.log10(rawMax)  * 10 + 4) / 10)

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const d = Number(params[0]?.value[0])
        const dLabel = d < 0.01 ? `${(d * 1000).toFixed(2)} μm` : `${d} mm`
        return `粒径 ${dLabel}<br/>` +
          params.map(p => `${p.seriesName}: ${Number(p.value[1]).toFixed(1)}%`).join('<br/>')
      },
    },
    legend: { show: false },
    grid: { left: 60, right: 20, top: 10, bottom: 75 },
    xAxis: {
      type: 'log',
      name: '粒径 (mm)',
      nameLocation: 'middle',
      nameGap: 52,      // visual empty row below tick labels
      min: xMin,
      max: xMax,
      axisLabel: {
        fontSize: 10,
        margin: 14,
        formatter: v => v >= 0.001 ? `${+v.toPrecision(3)}` : `${v}`,
      },
    },
    yAxis: {
      type: 'value',
      name: '累计通过率 (%)',
      min: 0, max: 100,
      nameTextStyle: { fontSize: 11 },
    },
    series: activeSeries.map(s => ({
      name: s.name,
      type: 'line',
      data: s.data.map(({ d, P }) => [d, P]),
      lineStyle: { type: s.dashed ? 'dashed' : 'solid', width: s.dashed ? 1.5 : 2 },
      symbol: s.dashed ? 'none' : 'circle',
      symbolSize: 4,
      color: s.color,
    })),
  }

  return (
    <Box>
      {/* Custom legend — checkboxes directly control ECharts series list */}
      <Stack direction="row" flexWrap="wrap" sx={{ px: 1, pt: 0.5 }}>
        {series.map(s => (
          <FormControlLabel
            key={s.name}
            control={
              <Checkbox
                size="small"
                checked={visible[s.name] !== false}
                onChange={() => toggle(s.name)}
                sx={{ color: s.color, '&.Mui-checked': { color: s.color }, p: 0.5 }}
              />
            }
            label={
              <Typography variant="caption"
                sx={{ color: visible[s.name] !== false ? s.color : 'text.disabled' }}>
                {s.name}
              </Typography>
            }
            sx={{ mr: 1.5 }}
          />
        ))}
      </Stack>

      {/* notMerge forces full option replacement so toggled-off series truly disappear */}
      <ReactECharts ref={echartsRef} option={option} notMerge style={{ height: 330 }} />
    </Box>
  )
})

export default GradationChart
