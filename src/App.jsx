import { useState, useRef } from 'react'
import {
  Container, AppBar, Toolbar, Typography, Box, Paper, Divider,
  Button, Snackbar, Alert as MuiAlert, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import FileUploadOutlinedIcon  from '@mui/icons-material/FileUploadOutlined'
import FileDownload            from '@mui/icons-material/FileDownload'
import ArticleOutlinedIcon     from '@mui/icons-material/ArticleOutlined'

import StepA_MaxSize   from './components/StepA_MaxSize'
import StepB_Sieve     from './components/StepB_Sieve'
import StepC_Powder    from './components/StepC_Powder'
import StepD_Moisture  from './components/StepD_Moisture'
import StepE_Strength  from './components/StepE_Strength'
import StepF_Feedback  from './components/StepF_Feedback'
import GradationChart  from './components/GradationChart'
import ResultsDisplay  from './components/ResultsDisplay'

import { downloadJSON, buildExportPayload, parseImportPayload } from './utils/dataIO'
import { buildReportHtml }                                        from './utils/reportHtml'

const SEP = <Divider sx={{ my: 2 }} />

const COLORS = {
  fullerTheory: '#1976d2',
  sand:         '#2e7d32',
  stone:        '#795548',
  blended:      '#e65100',
}

export default function App() {
  // Computed step results
  const [stepA, setStepA] = useState(null)
  const [stepB, setStepB] = useState(null)
  const [stepC, setStepC] = useState(null)
  const [stepD, setStepD] = useState(null)
  const [stepE, setStepE] = useState(null)

  // importKey forces step components to remount when data is imported
  const [importKey, setImportKey] = useState(0)

  // UI feedback
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' })
  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity })

  // Refs
  const chartRef    = useRef(null)
  const fileInputRef = useRef(null)

  // ── Chart series ──────────────────────────────────────────────────────────
  const chartSeries = []
  const fullerCurve = stepB?.fullerTheoryCurve ?? stepA?.fullerTheoryCurve
  if (fullerCurve) {
    chartSeries.push({ name: 'Fuller 理论', data: fullerCurve, color: COLORS.fullerTheory, dashed: true })
  }
  if (stepB) {
    chartSeries.push({ name: '砂实测',  data: stepB.sandPSD,    color: COLORS.sand })
    chartSeries.push({ name: '石实测',  data: stepB.stonePSD,   color: COLORS.stone })
    chartSeries.push({ name: '优化混合', data: stepB.blendedPSD, color: COLORS.blended })
  }

  // ── Results panel ─────────────────────────────────────────────────────────
  const results = {
    dMax:              stepA?.dMax,
    optimalSandRatio:  stepB?.optimalSandRatio,
    fm:                stepB?.fm,
    dosages:           stepC?.dosages,
    sandDryMass:       stepC?.sandDryMass,
    stoneDryMass:      stepC?.stoneDryMass,
    designWater:       stepD?.designWater,
    actualWater:       stepD?.actualWater,
    totalWaterCarried: stepD?.totalWaterCarried,
    sand:              stepD?.sand,
    stone:             stepD?.stone,
    grade:             stepE?.grade,
    target:            stepE?.target,
    strength:          stepE?.strength,
    checks:            stepE?.checks,
  }

  // ── Export JSON ───────────────────────────────────────────────────────────
  const handleExportData = () => {
    if (!stepA && !stepB && !stepC && !stepD && !stepE) {
      showSnack('暂无可导出的数据，请先完成至少一个计算步骤', 'warning')
      return
    }
    const payload = buildExportPayload({ stepA, stepB, stepC, stepD, stepE })
    const grade   = stepE?.grade ?? 'mix'
    downloadJSON(payload, `HPC-IDS_${grade}_${new Date().toISOString().slice(0,10)}.json`)
    showSnack('数据已导出为 JSON 文件')
  }

  // ── Import JSON ───────────────────────────────────────────────────────────
  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const results = parseImportPayload(ev.target.result)
        // Restore all computed step results immediately
        if (results.stepA) setStepA(results.stepA)
        if (results.stepB) setStepB(results.stepB)
        if (results.stepC) setStepC(results.stepC)
        if (results.stepD) setStepD(results.stepD)
        if (results.stepE) setStepE(results.stepE)
        setImportKey(k => k + 1)  // trigger step component remount
        showSnack('数据导入成功，结果面板已更新')
      } catch (err) {
        showSnack(`导入失败：${err.message}`, 'error')
      }
      e.target.value = ''  // allow re-import of same file
    }
    reader.readAsText(file)
  }

  // ── Export report ─────────────────────────────────────────────────────────
  const handleExportReport = () => {
    if (!stepA && !stepC && !stepE) {
      showSnack('请先完成基本计算步骤（A / C / E）再导出报告', 'warning')
      return
    }
    const chartImage = chartRef.current?.getChartImage() ?? null
    const html = buildReportHtml({
      stepA, stepB, stepC, stepD, stepE,
      chartImageUrl: chartImage,
      exportedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const w    = window.open(url, '_blank')
    if (w) {
      // Revoke the object URL after the window has had time to load it
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } else {
      URL.revokeObjectURL(url)
      showSnack('弹出窗口被浏览器拦截，请允许弹出后重试', 'warning')
    }
  }

  return (
    <>
      {/* ── AppBar ── */}
      <AppBar position="static" elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
            HPC-IDS 高性能混凝土智能设计系统
          </Typography>
        </Toolbar>
      </AppBar>

      {/* ── Import / Export toolbar ── */}
      <Box sx={{
        px: 2, py: 0.8,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex', gap: 1, alignItems: 'center',
      }}>
        <Tooltip title="导入之前保存的 JSON 配比数据">
          <Button
            size="small"
            startIcon={<FileUploadOutlinedIcon />}
            onClick={() => fileInputRef.current.click()}
          >
            导入数据
          </Button>
        </Tooltip>

        <Tooltip title="将当前所有计算结果保存为 JSON 文件">
          <Button
            size="small"
            startIcon={<FileDownload />}
            onClick={handleExportData}
          >
            导出数据
          </Button>
        </Tooltip>

        <Tooltip title="生成包含级配曲线和完整配合比的可打印报告">
          <Button
            size="small"
            variant="outlined"
            startIcon={<ArticleOutlinedIcon />}
            onClick={handleExportReport}
          >
            导出报告
          </Button>
        </Tooltip>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </Box>

      {/* ── Main layout ── */}
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Grid container spacing={2}>

          {/* Left: sequential steps — key forces remount on import */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 2 }} key={importKey}>

              <StepA_MaxSize onResult={r => {
                setStepA(r)
                setStepB(null); setStepC(null); setStepD(null); setStepE(null)
              }} />

              {SEP}

              <StepB_Sieve
                dMax={stepA?.dMax}
                onResult={r => { setStepB(r); setStepD(null); setStepE(null) }}
              />

              {SEP}

              <StepC_Powder
                dMax={stepA?.dMax}
                optimalSandRatio={stepB?.optimalSandRatio}
                onResult={r => { setStepC(r); setStepD(null); setStepE(null) }}
              />

              {SEP}

              <StepD_Moisture
                sandDryMass={stepC?.sandDryMass}
                stoneDryMass={stepC?.stoneDryMass}
                onResult={setStepD}
              />

              {SEP}

              <StepE_Strength
                dosages={stepC?.dosages}
                designWater={stepD?.designWater}
                onResult={setStepE}
              />

              {SEP}

              <StepF_Feedback predictedStrength={stepE?.strength} />

            </Paper>
          </Grid>

          {/* Right: chart + results */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <GradationChart ref={chartRef} series={chartSeries} />
              <ResultsDisplay results={results} />
            </Box>
          </Grid>

        </Grid>
      </Container>

      {/* ── Snackbar feedback ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert
          severity={snack.severity}
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.msg}
        </MuiAlert>
      </Snackbar>
    </>
  )
}
