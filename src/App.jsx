import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'

import GradationChart from './components/GradationChart'
import { aaFilling } from './utils/aa'
import { fullerOptimization } from './utils/fuller'
import { maaCalibrate, maaStrengthPredict } from './utils/maa'
import { correctMoisture } from './utils/moisture'
import { buildPowderList } from './utils/powderPSD'
import { validateMix } from './utils/validator'

const AGGREGATE_DENSITY = 2650
const AIR_CONTENT = 0.02
const SIEVES = [0.075, 0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 9.5, 16, 19, 26.5, 31.5, 37.5]
const POWDER_OPTIONS = [
  { key: 'flyAsh', label: '粉煤灰' },
  { key: 'ggbs', label: '矿渣粉' },
  { key: 'sf', label: '硅灰' },
]
const ADMIXTURE_OPTIONS = [
  { value: 'none', label: '无增强剂' },
  { value: 'typeA', label: 'A 型（早强型）' },
  { value: 'typeB', label: 'B 型（后期增强型）' },
  { value: 'typeC', label: 'C 型（综合型）' },
]

const emptyPSD = () => SIEVES.map((d) => ({ d, P: '' }))

export default function App() {
  const fileInputRef = useRef(null)
  const [fullerInputs, setFullerInputs] = useState({
    dMax: '26.5',
    sandPSD: emptyPSD(),
    stonePSD: emptyPSD(),
  })
  const [aaInputs, setAaInputs] = useState({
    dMax: '',
    voidRatio: '0.38',
    q: '0.25',
    powders: { flyAsh: true, ggbs: true, sf: false },
  })
  const [maaInputs, setMaaInputs] = useState({
    cement: '',
    flyAsh: '',
    ggbs: '',
    sf: '',
    temp: '20',
    admixture: 'none',
  })
  const [safetyInputs, setSafetyInputs] = useState({
    water: '160',
    cementDosage: '',
    totalPowder: '',
    wbLimit: '0.38',
  })
  const [moistureInputs, setMoistureInputs] = useState({
    designWater: '',
    sandDryMass: '',
    stoneDryMass: '',
    sandMoisture: '3',
    stoneMoisture: '1',
  })
  const [feedbackInputs, setFeedbackInputs] = useState({
    cement: '',
    flyAsh: '',
    ggbs: '',
    sf: '',
    temp: '',
    admixture: '',
    measured2: '',
    measured3: '',
    measured28: '',
  })

  const [useCustomAa, setUseCustomAa] = useState(false)
  const [useCustomMaa, setUseCustomMaa] = useState(false)
  const [useCustomSafety, setUseCustomSafety] = useState(false)
  const [useCustomMoisture, setUseCustomMoisture] = useState(false)
  const [useCustomFeedback, setUseCustomFeedback] = useState(false)

  const [fullerResult, setFullerResult] = useState(null)
  const [aaResult, setAaResult] = useState(null)
  const [maaResult, setMaaResult] = useState(null)
  const [safetyResult, setSafetyResult] = useState(null)
  const [moistureResult, setMoistureResult] = useState(null)
  const [feedbackResult, setFeedbackResult] = useState(null)

  const [fullerError, setFullerError] = useState('')
  const [aaError, setAaError] = useState('')
  const [maaError, setMaaError] = useState('')
  const [safetyError, setSafetyError] = useState('')
  const [moistureError, setMoistureError] = useState('')
  const [feedbackError, setFeedbackError] = useState('')

  const workflowDosages = useMemo(() => {
    if (!aaResult) {
      return null
    }

    return {
      cement: aaResult.dosages.find((item) => item.name === '水泥')?.kg ?? 0,
      flyAsh: aaResult.dosages.find((item) => item.name === '粉煤灰')?.kg ?? 0,
      ggbs: aaResult.dosages.find((item) => item.name === '矿渣粉')?.kg ?? 0,
      sf: aaResult.dosages.find((item) => item.name === '硅灰')?.kg ?? 0,
      totalPowder: aaResult.dosages.reduce((sum, item) => sum + item.kg, 0),
    }
  }, [aaResult])

  const aggregateMasses = useMemo(() => {
    if (!fullerResult || !aaResult) {
      return null
    }

    const aggregateVolume = 1 - AIR_CONTENT - aaResult.pasteVolume
    const totalAggregateMass = aggregateVolume * AGGREGATE_DENSITY
    return {
      sandDryMass: Math.round(totalAggregateMass * fullerResult.optimalSandRatio),
      stoneDryMass: Math.round(totalAggregateMass * (1 - fullerResult.optimalSandRatio)),
    }
  }, [aaResult, fullerResult])

  const aaDerivedDmax = fullerResult ? fullerInputs.dMax : ''
  const maaWorkflowValues = workflowDosages
    ? {
        cement: String(workflowDosages.cement),
        flyAsh: String(workflowDosages.flyAsh),
        ggbs: String(workflowDosages.ggbs),
        sf: String(workflowDosages.sf),
      }
    : null
  const safetyWorkflowValues = workflowDosages
    ? {
        cementDosage: String(workflowDosages.cement),
        totalPowder: String(Math.round(workflowDosages.totalPowder * 10) / 10),
      }
    : null
  const moistureWorkflowValues = aggregateMasses
    ? {
        designWater: safetyInputs.water,
        sandDryMass: String(aggregateMasses.sandDryMass),
        stoneDryMass: String(aggregateMasses.stoneDryMass),
      }
    : null
  const feedbackWorkflowValues =
    workflowDosages && maaInputs.temp && maaInputs.admixture
      ? {
          cement: String(workflowDosages.cement),
          flyAsh: String(workflowDosages.flyAsh),
          ggbs: String(workflowDosages.ggbs),
          sf: String(workflowDosages.sf),
          temp: maaInputs.temp,
          admixture: maaInputs.admixture,
        }
      : null

  const handleFullerCalculate = () => {
    const missing = []
    if (!fullerInputs.dMax) missing.push('最大粒径 Dmax')

    if (missing.length > 0) {
      setFullerError(`请先填写必填项：${missing.join('、')}`)
      setFullerResult(null)
      return
    }

    try {
      const normalizedPSD = normalizePSDPair(fullerInputs.sandPSD, fullerInputs.stonePSD)

      const result = fullerOptimization({
        sandPSD: normalizedPSD.sandPSD,
        stonePSD: normalizedPSD.stonePSD,
        dMax: Number(fullerInputs.dMax),
      })
      setFullerResult(result)
      setFullerError('')
    } catch (error) {
      setFullerResult(null)
      setFullerError(error.message)
    }
  }

  const handleAaCalculate = () => {
    const dMaxValue = useCustomAa ? aaInputs.dMax : aaDerivedDmax
    const missing = []

    if (!aaInputs.voidRatio) missing.push('骨架空隙率')
    if (!aaInputs.q) missing.push('q 值')
    if (!dMaxValue) missing.push('最大粒径 Dmax')

    if (missing.length > 0) {
      setAaError(`请先填写必填项：${missing.join('、')}`)
      setAaResult(null)
      return
    }

    try {
      const selectedPowders = [
        'cement',
        ...Object.entries(aaInputs.powders)
          .filter(([, checked]) => checked)
          .map(([key]) => key),
      ]

      const result = aaFilling({
        skeletonVoidRatio: Number(aaInputs.voidRatio),
        dMax: Number(dMaxValue),
        q: Number(aaInputs.q),
        powders: buildPowderList(selectedPowders),
      })
      setAaResult(result)
      setAaError('')
    } catch (error) {
      setAaResult(null)
      setAaError(error.message)
    }
  }

  const handleMaaCalculate = () => {
    const values = resolveMaaValues(maaInputs, maaWorkflowValues, useCustomMaa)
    const missing = requiredFields(values, {
      cement: '水泥',
      temp: '温度',
      admixture: '增强剂类型',
    })

    if (!useCustomMaa && !maaWorkflowValues) {
      missing.unshift('A&A 结果或自定义配比')
    }

    if (missing.length > 0) {
      setMaaError(`请先填写必填项：${missing.join('、')}`)
      setMaaResult(null)
      return
    }

    try {
      const result = maaStrengthPredict({
        dosages: {
          cement: Number(values.cement),
          flyAsh: Number(values.flyAsh || 0),
          ggbs: Number(values.ggbs || 0),
          sf: Number(values.sf || 0),
        },
        temp: Number(values.temp),
        admixture: values.admixture,
      })
      setMaaResult(result)
      setMaaError('')
    } catch (error) {
      setMaaResult(null)
      setMaaError(error.message)
    }
  }

  const handleSafetyCalculate = () => {
    const values = resolveSafetyValues(safetyInputs, safetyWorkflowValues, useCustomSafety)
    const missing = requiredFields(values, {
      water: '用水量',
      cementDosage: '水泥用量',
      totalPowder: '总粉体量',
      wbLimit: '水胶比上限',
    })

    if (!useCustomSafety && !safetyWorkflowValues) {
      missing.unshift('A&A 结果或自定义粉体数据')
    }

    if (missing.length > 0) {
      setSafetyError(`请先填写必填项：${missing.join('、')}`)
      setSafetyResult(null)
      return
    }

    try {
      const result = validateMix({
        water: Number(values.water),
        cementDosage: Number(values.cementDosage),
        totalPowder: Number(values.totalPowder),
        wbLimit: Number(values.wbLimit),
      })
      setSafetyResult(result)
      setSafetyError('')
    } catch (error) {
      setSafetyResult(null)
      setSafetyError(error.message)
    }
  }

  const handleMoistureCalculate = () => {
    const values = resolveMoistureValues(moistureInputs, moistureWorkflowValues, useCustomMoisture)
    const missing = requiredFields(values, {
      designWater: '设计加水量',
      sandDryMass: '砂干料量',
      sandMoisture: '砂含水率',
      stoneDryMass: '石干料量',
      stoneMoisture: '石含水率',
    })

    if (!useCustomMoisture && !moistureWorkflowValues) {
      missing.unshift('上一步结果或自定义投料数据')
    }

    if (missing.length > 0) {
      setMoistureError(`请先填写必填项：${missing.join('、')}`)
      setMoistureResult(null)
      return
    }

    try {
      const result = correctMoisture({
        designWater: Number(values.designWater),
        sandDryMass: Number(values.sandDryMass),
        sandMoisture: Number(values.sandMoisture),
        stoneDryMass: Number(values.stoneDryMass),
        stoneMoisture: Number(values.stoneMoisture),
      })
      setMoistureResult(result)
      setMoistureError('')
    } catch (error) {
      setMoistureResult(null)
      setMoistureError(error.message)
    }
  }

  const handleFeedbackCalculate = () => {
    const values = resolveFeedbackValues(feedbackInputs, feedbackWorkflowValues, useCustomFeedback)
    const missing = requiredFields(values, {
      cement: '水泥',
      temp: '温度',
      admixture: '增强剂类型',
    })

    const measured = {}
    if (values.measured2) measured[2] = Number(values.measured2)
    if (values.measured3) measured[3] = Number(values.measured3)
    if (values.measured28) measured[28] = Number(values.measured28)

    if (!useCustomFeedback && !feedbackWorkflowValues) {
      missing.unshift('MAA 输入结果或自定义配比')
    }
    if (Object.keys(measured).length === 0) {
      missing.push('至少一个龄期实测强度')
    }

    if (missing.length > 0) {
      setFeedbackError(`请先填写必填项：${missing.join('、')}`)
      setFeedbackResult(null)
      return
    }

    try {
      const dosages = {
        cement: Number(values.cement),
        flyAsh: Number(values.flyAsh || 0),
        ggbs: Number(values.ggbs || 0),
        sf: Number(values.sf || 0),
      }
      const before = maaStrengthPredict({
        dosages,
        temp: Number(values.temp),
        admixture: values.admixture,
      })
      const calibration = maaCalibrate({
        measured,
        dosages,
        temp: Number(values.temp),
        admixture: values.admixture,
      })
      const after = maaStrengthPredict({
        dosages,
        temp: Number(values.temp),
        admixture: values.admixture,
        kOverride: calibration.kAdjusted,
      })

      setFeedbackResult({ before, calibration, after })
      setFeedbackError('')
    } catch (error) {
      setFeedbackResult(null)
      setFeedbackError(error.message)
    }
  }

  const handleExport = () => {
    const snapshot = buildSnapshot({
      fullerInputs,
      aaInputs,
      maaInputs,
      safetyInputs,
      moistureInputs,
      feedbackInputs,
      useCustomAa,
      useCustomMaa,
      useCustomSafety,
      useCustomMoisture,
      useCustomFeedback,
      fullerResult,
      aaResult,
      maaResult,
      safetyResult,
      moistureResult,
      feedbackResult,
      fullerError,
      aaError,
      maaError,
      safetyError,
      moistureError,
      feedbackError,
    })

    const headers = Object.keys(snapshot)
    const row = headers.map((header) => csvEscape(serializeCsvValue(snapshot[header])))
    const csv = `${headers.join(',')}\n${row.join(',')}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hpc_ids_snapshot_${formatTimestamp(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const records = parseCsv(text)
      const headers = records[0] ?? []
      const values = records[1] ?? []

      if (headers.length === 0 || values.length === 0) {
        throw new Error('CSV 内容为空或格式不正确')
      }

      const snapshot = Object.fromEntries(
        headers.map((header, index) => [header, deserializeCsvValue(values[index] ?? 'NULL')])
      )

      hydrateSnapshot(snapshot, {
        setFullerInputs,
        setAaInputs,
        setMaaInputs,
        setSafetyInputs,
        setMoistureInputs,
        setFeedbackInputs,
        setUseCustomAa,
        setUseCustomMaa,
        setUseCustomSafety,
        setUseCustomMoisture,
        setUseCustomFeedback,
        setFullerResult,
        setAaResult,
        setMaaResult,
        setSafetyResult,
        setMoistureResult,
        setFeedbackResult,
        setFullerError,
        setAaError,
        setMaaError,
        setSafetyError,
        setMoistureError,
        setFeedbackError,
      })
    } catch (error) {
      setFeedbackError(error.message)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <>
      <AppBar position="static" color="inherit" elevation={0}>
        <Toolbar sx={{ py: 1.5 }}>
          <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                HPC-IDS 高性能混凝土智能设计系统
              </Typography>
              <Typography variant="body2" color="text.secondary">
                混凝土配比计算、级配曲线展示、强度预测与现场投料换算
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexShrink: 0 }}>
              <Button variant="outlined" onClick={handleImportClick}>
                导入 CSV
              </Button>
              <Button variant="contained" onClick={handleExport}>
                导出 CSV
              </Button>
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={handleImportFile}
            />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            alignItems: 'flex-start',
            gap: 3,
          }}
        >
          <Box sx={{ width: { xs: '100%', lg: 'min(480px, 36vw)' }, flexShrink: 0 }}>
            <Box
              sx={{
                maxHeight: { lg: 'calc(100vh - 120px)' },
                overflowY: { lg: 'auto' },
                pr: { lg: 1 },
              }}
            >
              <Stack spacing={2.5}>
                <ModuleSection
                  title="1. Fuller 骨架优化"
                  description="输入砂石筛分数据和最大粒径，计算最优砂率。"
                  error={fullerError}
                >
                  <Stack spacing={2}>
                    <NumberField
                      label="最大粒径 Dmax (mm)"
                      value={fullerInputs.dMax}
                      onChange={(value) => setFullerInputs((prev) => ({ ...prev, dMax: value }))}
                      required
                    />
                    <PSDGrid
                      title="砂筛分数据"
                      psd={fullerInputs.sandPSD}
                      onChange={(sandPSD) => setFullerInputs((prev) => ({ ...prev, sandPSD }))}
                    />
                    <PSDGrid
                      title="石筛分数据"
                      psd={fullerInputs.stonePSD}
                      onChange={(stonePSD) => setFullerInputs((prev) => ({ ...prev, stonePSD }))}
                    />
                    <Button variant="contained" onClick={handleFullerCalculate}>
                      计算 Fuller
                    </Button>
                  </Stack>
                </ModuleSection>

                <ModuleSection
                  title="2. A&A 浆体填充"
                  description="输入骨架空隙率、q 值和粉体条件，计算浆体体积和粉体用量。"
                  error={aaError}
                >
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={<Checkbox checked={useCustomAa} onChange={(event) => setUseCustomAa(event.target.checked)} />}
                      label="使用自定义数据"
                    />
                    <NumberField
                      label="最大粒径 Dmax (mm)"
                      value={useCustomAa ? aaInputs.dMax : aaDerivedDmax}
                      onChange={(value) => setAaInputs((prev) => ({ ...prev, dMax: value }))}
                      disabled={!useCustomAa && Boolean(aaDerivedDmax)}
                      required
                    />
                    <NumberField
                      label="骨架空隙率"
                      value={aaInputs.voidRatio}
                      onChange={(value) => setAaInputs((prev) => ({ ...prev, voidRatio: value }))}
                      required
                    />
                    <NumberField
                      label="q 值"
                      value={aaInputs.q}
                      onChange={(value) => setAaInputs((prev) => ({ ...prev, q: value }))}
                      required
                    />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        粉体选择
                      </Typography>
                      <Stack>
                        <FormControlLabel control={<Checkbox checked disabled />} label="水泥（固定参与计算）" />
                        {POWDER_OPTIONS.map((option) => (
                          <FormControlLabel
                            key={option.key}
                            control={
                              <Checkbox
                                checked={aaInputs.powders[option.key]}
                                onChange={() =>
                                  setAaInputs((prev) => ({
                                    ...prev,
                                    powders: { ...prev.powders, [option.key]: !prev.powders[option.key] },
                                  }))
                                }
                              />
                            }
                            label={option.label}
                          />
                        ))}
                      </Stack>
                    </Box>
                    <Button variant="contained" onClick={handleAaCalculate}>
                      计算 A&A
                    </Button>
                  </Stack>
                </ModuleSection>

                <ModuleSection
                  title="3. MAA 强度预测"
                  description="输入胶凝材料用量、温度和增强剂条件，预测龄期强度。"
                  error={maaError}
                >
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={<Checkbox checked={useCustomMaa} onChange={(event) => setUseCustomMaa(event.target.checked)} />}
                      label="使用自定义数据"
                    />
                    <NumberField
                      label="水泥 (kg/m³)"
                      value={getValue('cement', maaInputs, maaWorkflowValues, useCustomMaa)}
                      onChange={(value) => setMaaInputs((prev) => ({ ...prev, cement: value }))}
                      disabled={!useCustomMaa && Boolean(maaWorkflowValues?.cement)}
                      required
                    />
                    <NumberField
                      label="粉煤灰 (kg/m³)"
                      value={getValue('flyAsh', maaInputs, maaWorkflowValues, useCustomMaa)}
                      onChange={(value) => setMaaInputs((prev) => ({ ...prev, flyAsh: value }))}
                      disabled={!useCustomMaa && Boolean(maaWorkflowValues?.flyAsh)}
                    />
                    <NumberField
                      label="矿渣粉 (kg/m³)"
                      value={getValue('ggbs', maaInputs, maaWorkflowValues, useCustomMaa)}
                      onChange={(value) => setMaaInputs((prev) => ({ ...prev, ggbs: value }))}
                      disabled={!useCustomMaa && Boolean(maaWorkflowValues?.ggbs)}
                    />
                    <NumberField
                      label="硅灰 (kg/m³)"
                      value={getValue('sf', maaInputs, maaWorkflowValues, useCustomMaa)}
                      onChange={(value) => setMaaInputs((prev) => ({ ...prev, sf: value }))}
                      disabled={!useCustomMaa && Boolean(maaWorkflowValues?.sf)}
                    />
                    <NumberField
                      label="温度 (°C)"
                      value={maaInputs.temp}
                      onChange={(value) => setMaaInputs((prev) => ({ ...prev, temp: value }))}
                      required
                    />
                    <TextField
                      select
                      size="small"
                      label="增强剂类型"
                      value={maaInputs.admixture}
                      onChange={(event) => setMaaInputs((prev) => ({ ...prev, admixture: event.target.value }))}
                      required
                    >
                      {ADMIXTURE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button variant="contained" onClick={handleMaaCalculate}>
                      预测强度
                    </Button>
                  </Stack>
                </ModuleSection>

                <ModuleSection
                  title="4. 安全校验"
                  description="检查水胶比、水泥用量和总粉体量是否满足要求。"
                  error={safetyError}
                >
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Checkbox checked={useCustomSafety} onChange={(event) => setUseCustomSafety(event.target.checked)} />
                      }
                      label="使用自定义数据"
                    />
                    <NumberField
                      label="用水量 (kg/m³)"
                      value={safetyInputs.water}
                      onChange={(value) => setSafetyInputs((prev) => ({ ...prev, water: value }))}
                      required
                    />
                    <NumberField
                      label="水泥用量 (kg/m³)"
                      value={getValue('cementDosage', safetyInputs, safetyWorkflowValues, useCustomSafety)}
                      onChange={(value) => setSafetyInputs((prev) => ({ ...prev, cementDosage: value }))}
                      disabled={!useCustomSafety && Boolean(safetyWorkflowValues?.cementDosage)}
                      required
                    />
                    <NumberField
                      label="总粉体量 (kg/m³)"
                      value={getValue('totalPowder', safetyInputs, safetyWorkflowValues, useCustomSafety)}
                      onChange={(value) => setSafetyInputs((prev) => ({ ...prev, totalPowder: value }))}
                      disabled={!useCustomSafety && Boolean(safetyWorkflowValues?.totalPowder)}
                      required
                    />
                    <NumberField
                      label="水胶比上限"
                      value={safetyInputs.wbLimit}
                      onChange={(value) => setSafetyInputs((prev) => ({ ...prev, wbLimit: value }))}
                      required
                    />
                    <Button variant="contained" onClick={handleSafetyCalculate}>
                      校验风险
                    </Button>
                  </Stack>
                </ModuleSection>

                <ModuleSection
                  title="5. 含水率扣水"
                  description="根据设计水量、干料量和含水率，换算现场实际投料量。"
                  error={moistureError}
                >
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Checkbox checked={useCustomMoisture} onChange={(event) => setUseCustomMoisture(event.target.checked)} />
                      }
                      label="使用自定义数据"
                    />
                    <NumberField
                      label="设计加水量 (kg/m³)"
                      value={getValue('designWater', moistureInputs, moistureWorkflowValues, useCustomMoisture)}
                      onChange={(value) => setMoistureInputs((prev) => ({ ...prev, designWater: value }))}
                      disabled={!useCustomMoisture && Boolean(moistureWorkflowValues?.designWater)}
                      required
                    />
                    <NumberField
                      label="砂干料量 (kg/m³)"
                      value={getValue('sandDryMass', moistureInputs, moistureWorkflowValues, useCustomMoisture)}
                      onChange={(value) => setMoistureInputs((prev) => ({ ...prev, sandDryMass: value }))}
                      disabled={!useCustomMoisture && Boolean(moistureWorkflowValues?.sandDryMass)}
                      required
                    />
                    <NumberField
                      label="砂含水率 (%)"
                      value={moistureInputs.sandMoisture}
                      onChange={(value) => setMoistureInputs((prev) => ({ ...prev, sandMoisture: value }))}
                      required
                    />
                    <NumberField
                      label="石干料量 (kg/m³)"
                      value={getValue('stoneDryMass', moistureInputs, moistureWorkflowValues, useCustomMoisture)}
                      onChange={(value) => setMoistureInputs((prev) => ({ ...prev, stoneDryMass: value }))}
                      disabled={!useCustomMoisture && Boolean(moistureWorkflowValues?.stoneDryMass)}
                      required
                    />
                    <NumberField
                      label="石含水率 (%)"
                      value={moistureInputs.stoneMoisture}
                      onChange={(value) => setMoistureInputs((prev) => ({ ...prev, stoneMoisture: value }))}
                      required
                    />
                    <Button variant="contained" onClick={handleMoistureCalculate}>
                      计算扣水
                    </Button>
                  </Stack>
                </ModuleSection>

                <ModuleSection
                  title="6. 实验反馈修正"
                  description="输入实测强度后修正模型参数，并生成新的预测结果。"
                  error={feedbackError}
                >
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Checkbox checked={useCustomFeedback} onChange={(event) => setUseCustomFeedback(event.target.checked)} />
                      }
                      label="使用自定义数据"
                    />
                    <NumberField
                      label="水泥 (kg/m³)"
                      value={getValue('cement', feedbackInputs, feedbackWorkflowValues, useCustomFeedback)}
                      onChange={(value) => setFeedbackInputs((prev) => ({ ...prev, cement: value }))}
                      disabled={!useCustomFeedback && Boolean(feedbackWorkflowValues?.cement)}
                      required
                    />
                    <NumberField
                      label="粉煤灰 (kg/m³)"
                      value={getValue('flyAsh', feedbackInputs, feedbackWorkflowValues, useCustomFeedback)}
                      onChange={(value) => setFeedbackInputs((prev) => ({ ...prev, flyAsh: value }))}
                      disabled={!useCustomFeedback && Boolean(feedbackWorkflowValues?.flyAsh)}
                    />
                    <NumberField
                      label="矿渣粉 (kg/m³)"
                      value={getValue('ggbs', feedbackInputs, feedbackWorkflowValues, useCustomFeedback)}
                      onChange={(value) => setFeedbackInputs((prev) => ({ ...prev, ggbs: value }))}
                      disabled={!useCustomFeedback && Boolean(feedbackWorkflowValues?.ggbs)}
                    />
                    <NumberField
                      label="硅灰 (kg/m³)"
                      value={getValue('sf', feedbackInputs, feedbackWorkflowValues, useCustomFeedback)}
                      onChange={(value) => setFeedbackInputs((prev) => ({ ...prev, sf: value }))}
                      disabled={!useCustomFeedback && Boolean(feedbackWorkflowValues?.sf)}
                    />
                    <NumberField
                      label="温度 (°C)"
                      value={getValue('temp', feedbackInputs, feedbackWorkflowValues, useCustomFeedback)}
                      onChange={(value) => setFeedbackInputs((prev) => ({ ...prev, temp: value }))}
                      disabled={!useCustomFeedback && Boolean(feedbackWorkflowValues?.temp)}
                      required
                    />
                    <TextField
                      select
                      size="small"
                      label="增强剂类型"
                      value={getValue('admixture', feedbackInputs, feedbackWorkflowValues, useCustomFeedback)}
                      onChange={(event) => setFeedbackInputs((prev) => ({ ...prev, admixture: event.target.value }))}
                      disabled={!useCustomFeedback && Boolean(feedbackWorkflowValues?.admixture)}
                      required
                    >
                      <MenuItem value="">请选择</MenuItem>
                      {ADMIXTURE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Divider />
                    <NumberField
                      label="2 天实测强度 (MPa)"
                      value={feedbackInputs.measured2}
                      onChange={(value) => setFeedbackInputs((prev) => ({ ...prev, measured2: value }))}
                    />
                    <NumberField
                      label="3 天实测强度 (MPa)"
                      value={feedbackInputs.measured3}
                      onChange={(value) => setFeedbackInputs((prev) => ({ ...prev, measured3: value }))}
                    />
                    <NumberField
                      label="28 天实测强度 (MPa)"
                      value={feedbackInputs.measured28}
                      onChange={(value) => setFeedbackInputs((prev) => ({ ...prev, measured28: value }))}
                    />
                    <Button variant="contained" onClick={handleFeedbackCalculate}>
                      修正 K 系数
                    </Button>
                  </Stack>
                </ModuleSection>
              </Stack>
            </Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                position: { lg: 'sticky' },
                top: { lg: 24 },
                maxHeight: { lg: 'calc(100vh - 48px)' },
                overflowY: { lg: 'auto' },
                pr: { lg: 1 },
              }}
            >
              <Stack spacing={2}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    级配曲线
                  </Typography>
                  <GradationChart fullerResult={fullerResult} aaResult={aaResult} />
                </Paper>

                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    计算结果
                  </Typography>
                  <Stack spacing={2.5}>
                    <ResultGroup title="Fuller 骨架优化">
                      <StatLine label="最优砂率" value={percentOrDash(fullerResult?.optimalSandRatio)} />
                      <StatLine label="拟合误差 RSS" value={numberOrDash(fullerResult?.rss, 4)} />
                    </ResultGroup>

                    <ResultGroup title="A&A 浆体填充">
                      <StatLine label="浆体体积" value={aaResult ? `${(aaResult.pasteVolume * 1000).toFixed(1)} L/m³` : '-'} />
                      <StatLine label="拟合误差 RSS" value={numberOrDash(aaResult?.rss, 4)} />
                      <SimpleTable
                        headers={['粉体', '用量 (kg/m³)']}
                        rows={[
                          ['水泥', workflowDosages?.cement],
                          ['粉煤灰', workflowDosages?.flyAsh],
                          ['矿渣粉', workflowDosages?.ggbs],
                          ['硅灰', workflowDosages?.sf],
                        ]}
                      />
                    </ResultGroup>

                    <ResultGroup title="MAA 强度预测">
                      <SimpleTable
                        headers={['龄期', '预测强度']}
                        rows={[
                          ['2 天', maaResult?.strength?.[2]],
                          ['3 天', maaResult?.strength?.[3]],
                          ['28 天', maaResult?.strength?.[28]],
                        ]}
                        suffix=" MPa"
                      />
                    </ResultGroup>

                    <ResultGroup title="安全校验">
                      <StatLine label="当前水胶比" value={valueOrDash(safetyResult?.waterBinderRatio)} />
                      <StatLine
                        label="校验结果"
                        value={
                          safetyResult
                            ? safetyResult.valid && safetyResult.alerts.length === 0
                              ? '通过'
                              : '存在风险'
                            : '-'
                        }
                      />
                      <StatLine
                        label="告警"
                        value={
                          safetyResult
                            ? safetyResult.alerts.length > 0
                              ? safetyResult.alerts.map((item) => item.message).join('；')
                              : '无'
                            : '-'
                        }
                      />
                    </ResultGroup>

                    <ResultGroup title="含水率扣水">
                      <StatLine label="砂实际投料量" value={moistureResult ? `${moistureResult.sand.actualMass} kg/m³` : '-'} />
                      <StatLine label="石实际投料量" value={moistureResult ? `${moistureResult.stone.actualMass} kg/m³` : '-'} />
                      <StatLine label="总带入水量" value={moistureResult ? `${moistureResult.totalWaterCarried} kg/m³` : '-'} />
                      <StatLine label="实际应加水量" value={moistureResult ? `${moistureResult.actualWater} kg/m³` : '-'} />
                    </ResultGroup>

                    <ResultGroup title="实验反馈修正">
                      <SimpleTable
                        headers={['龄期', '修正前', '修正后']}
                        rows={[
                          ['2 天', feedbackResult?.before?.strength?.[2], feedbackResult?.after?.strength?.[2]],
                          ['3 天', feedbackResult?.before?.strength?.[3], feedbackResult?.after?.strength?.[3]],
                          ['28 天', feedbackResult?.before?.strength?.[28], feedbackResult?.after?.strength?.[28]],
                        ]}
                        suffix=" MPa"
                      />
                    </ResultGroup>
                  </Stack>
                </Paper>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  )
}

function ModuleSection({ title, description, error, children }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      {children}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Paper>
  )
}

function ResultGroup({ title, children }) {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Stack spacing={1}>{children}</Stack>
    </Box>
  )
}

function PSDGrid({ title, psd, onChange }) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        {psd.map((point, index) => (
          <Box key={point.d}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={`${point.d} mm`}
              value={point.P}
              onChange={(event) => {
                const next = [...psd]
                next[index] = { ...next[index], P: event.target.value }
                onChange(next)
              }}
              placeholder="留空按 0 处理"
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function NumberField({ label, value, onChange, disabled = false, required = false }) {
  return (
    <TextField
      fullWidth
      size="small"
      type="number"
      label={required ? `${label} *` : label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  )
}

function StatLine({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography sx={{ textAlign: 'right' }}>{value}</Typography>
    </Box>
  )
}

function SimpleTable({ headers, rows, suffix = '' }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {headers.map((header) => (
            <TableCell key={header}>{header}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row[0]}-${index}`}>
            {row.map((cell, cellIndex) => (
              <TableCell key={`${row[0]}-${cellIndex}`}>
                {cellIndex === 0 ? cell : formatCell(cell, suffix)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function normalizePSDPair(sandPSD, stonePSD) {
  const paired = sandPSD
    .map((sandPoint, index) => ({
      d: sandPoint.d,
      sand: sandPoint.P,
      stone: stonePSD[index]?.P ?? '',
    }))
    .filter((point) => point.sand !== '' || point.stone !== '')

  const safePaired = paired.length > 0 ? paired : sandPSD.map((sandPoint, index) => ({
    d: sandPoint.d,
    sand: sandPoint.P,
    stone: stonePSD[index]?.P ?? '',
  }))

  return {
    sandPSD: safePaired.map((point) => ({ d: point.d, P: point.sand === '' ? 0 : Number(point.sand) })),
    stonePSD: safePaired.map((point) => ({ d: point.d, P: point.stone === '' ? 0 : Number(point.stone) })),
  }
}

function requiredFields(values, labels) {
  return Object.entries(labels)
    .filter(([key]) => values[key] === '' || values[key] === undefined || values[key] === null)
    .map(([, label]) => label)
}

function getValue(key, manualValues, workflowValues, useCustom) {
  if (!useCustom && workflowValues?.[key] !== undefined && workflowValues?.[key] !== '') {
    return workflowValues[key]
  }
  return manualValues[key] ?? ''
}

function resolveMaaValues(manualValues, workflowValues, useCustom) {
  return {
    cement: getValue('cement', manualValues, workflowValues, useCustom),
    flyAsh: getValue('flyAsh', manualValues, workflowValues, useCustom),
    ggbs: getValue('ggbs', manualValues, workflowValues, useCustom),
    sf: getValue('sf', manualValues, workflowValues, useCustom),
    temp: manualValues.temp,
    admixture: manualValues.admixture,
  }
}

function resolveSafetyValues(manualValues, workflowValues, useCustom) {
  return {
    water: manualValues.water,
    cementDosage: getValue('cementDosage', manualValues, workflowValues, useCustom),
    totalPowder: getValue('totalPowder', manualValues, workflowValues, useCustom),
    wbLimit: manualValues.wbLimit,
  }
}

function resolveMoistureValues(manualValues, workflowValues, useCustom) {
  return {
    designWater: getValue('designWater', manualValues, workflowValues, useCustom),
    sandDryMass: getValue('sandDryMass', manualValues, workflowValues, useCustom),
    sandMoisture: manualValues.sandMoisture,
    stoneDryMass: getValue('stoneDryMass', manualValues, workflowValues, useCustom),
    stoneMoisture: manualValues.stoneMoisture,
  }
}

function resolveFeedbackValues(manualValues, workflowValues, useCustom) {
  return {
    cement: getValue('cement', manualValues, workflowValues, useCustom),
    flyAsh: getValue('flyAsh', manualValues, workflowValues, useCustom),
    ggbs: getValue('ggbs', manualValues, workflowValues, useCustom),
    sf: getValue('sf', manualValues, workflowValues, useCustom),
    temp: getValue('temp', manualValues, workflowValues, useCustom),
    admixture: getValue('admixture', manualValues, workflowValues, useCustom),
    measured2: manualValues.measured2,
    measured3: manualValues.measured3,
    measured28: manualValues.measured28,
  }
}

function formatCell(value, suffix) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  return `${value}${suffix}`
}

function percentOrDash(value) {
  return value === undefined || value === null ? '-' : `${(value * 100).toFixed(1)} %`
}

function numberOrDash(value, digits = 1) {
  return value === undefined || value === null ? '-' : value.toFixed(digits)
}

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '-' : String(value)
}

function buildSnapshot(state) {
  return {
    fuller_inputs: state.fullerInputs,
    aa_inputs: state.aaInputs,
    maa_inputs: state.maaInputs,
    safety_inputs: state.safetyInputs,
    moisture_inputs: state.moistureInputs,
    feedback_inputs: state.feedbackInputs,
    use_custom_aa: state.useCustomAa,
    use_custom_maa: state.useCustomMaa,
    use_custom_safety: state.useCustomSafety,
    use_custom_moisture: state.useCustomMoisture,
    use_custom_feedback: state.useCustomFeedback,
    fuller_result: state.fullerResult,
    aa_result: state.aaResult,
    maa_result: state.maaResult,
    safety_result: state.safetyResult,
    moisture_result: state.moistureResult,
    feedback_result: state.feedbackResult,
    fuller_error: state.fullerError,
    aa_error: state.aaError,
    maa_error: state.maaError,
    safety_error: state.safetyError,
    moisture_error: state.moistureError,
    feedback_error: state.feedbackError,
  }
}

function hydrateSnapshot(snapshot, setters) {
  setters.setFullerInputs(restoreValue(snapshot.fuller_inputs, {
    dMax: '26.5',
    sandPSD: emptyPSD(),
    stonePSD: emptyPSD(),
  }))
  setters.setAaInputs(restoreValue(snapshot.aa_inputs, {
    dMax: '',
    voidRatio: '0.38',
    q: '0.25',
    powders: { flyAsh: true, ggbs: true, sf: false },
  }))
  setters.setMaaInputs(restoreValue(snapshot.maa_inputs, {
    cement: '',
    flyAsh: '',
    ggbs: '',
    sf: '',
    temp: '20',
    admixture: 'none',
  }))
  setters.setSafetyInputs(restoreValue(snapshot.safety_inputs, {
    water: '160',
    cementDosage: '',
    totalPowder: '',
    wbLimit: '0.38',
  }))
  setters.setMoistureInputs(restoreValue(snapshot.moisture_inputs, {
    designWater: '',
    sandDryMass: '',
    stoneDryMass: '',
    sandMoisture: '3',
    stoneMoisture: '1',
  }))
  setters.setFeedbackInputs(restoreValue(snapshot.feedback_inputs, {
    cement: '',
    flyAsh: '',
    ggbs: '',
    sf: '',
    temp: '',
    admixture: '',
    measured2: '',
    measured3: '',
    measured28: '',
  }))
  setters.setUseCustomAa(Boolean(snapshot.use_custom_aa))
  setters.setUseCustomMaa(Boolean(snapshot.use_custom_maa))
  setters.setUseCustomSafety(Boolean(snapshot.use_custom_safety))
  setters.setUseCustomMoisture(Boolean(snapshot.use_custom_moisture))
  setters.setUseCustomFeedback(Boolean(snapshot.use_custom_feedback))
  setters.setFullerResult(restoreNullable(snapshot.fuller_result))
  setters.setAaResult(restoreNullable(snapshot.aa_result))
  setters.setMaaResult(restoreNullable(snapshot.maa_result))
  setters.setSafetyResult(restoreNullable(snapshot.safety_result))
  setters.setMoistureResult(restoreNullable(snapshot.moisture_result))
  setters.setFeedbackResult(restoreNullable(snapshot.feedback_result))
  setters.setFullerError(restoreString(snapshot.fuller_error))
  setters.setAaError(restoreString(snapshot.aa_error))
  setters.setMaaError(restoreString(snapshot.maa_error))
  setters.setSafetyError(restoreString(snapshot.safety_error))
  setters.setMoistureError(restoreString(snapshot.moisture_error))
  setters.setFeedbackError(restoreString(snapshot.feedback_error))
}

function restoreValue(value, fallback) {
  return value === null ? fallback : value
}

function restoreNullable(value) {
  return value === null ? null : value
}

function restoreString(value) {
  return value === null ? '' : String(value)
}

function serializeCsvValue(value) {
  if (value === '' || value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function deserializeCsvValue(value) {
  if (value === 'NULL' || value === '') {
    return null
  }
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function csvEscape(value) {
  const normalized = value ?? 'NULL'
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }
      row.push(cell)
      if (row.some((item) => item !== '')) {
        rows.push(row)
      }
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell)
    if (row.some((item) => item !== '')) {
      rows.push(row)
    }
  }

  return rows
}

function formatTimestamp(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}
