import { useState } from 'react'
import {
  Box, Typography, Select, MenuItem, TextField,
  Button, Alert, Stack, FormControl, InputLabel, Divider,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon       from '@mui/icons-material/ErrorOutline'
import { maaStrengthPredict } from '../utils/maa'

const GRADES = ['C15','C20','C25','C30','C35','C40','C50','C60','C80','C100','C120']
const SIGMA = 5 // MPa

const ADMIXTURE_OPTS = [
  { value: 'none',  label: '无增强剂' },
  { value: 'typeA', label: '早强型 (+20% 早期)' },
  { value: 'typeB', label: '后期增强型 (+15% 28d)' },
  { value: 'typeC', label: '综合型 (+10% 全龄期)' },
]

const POWDER_NAMES = { cement: '水泥', flyAsh: '粉煤灰', ggbs: '矿渣粉', sf: '硅灰' }

function fcu0(grade) {
  const fck = parseInt(grade.replace('C', ''))
  return Math.round((fck + 1.645 * SIGMA) * 10) / 10
}

function CheckRow({ label, pass, value }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ py: 0.3 }}>
      {pass
        ? <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main' }} />
        : <ErrorOutlineIcon       fontSize="small" sx={{ color: 'error.main'   }} />
      }
      <Typography variant="caption" color={pass ? 'success.main' : 'error.main'}>
        {label}: {value}
      </Typography>
    </Stack>
  )
}

export default function StepE_Strength({ dosages, designWater, onResult }) {
  const [grade,     setGrade]     = useState('C30')
  const [cureTemp,  setCureTemp]  = useState('20')
  const [admixture, setAdmixture] = useState('none')
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)
  const [result,    setResult]    = useState(null)

  const prereqMissing = !dosages?.cement || dosages.cement <= 0

  const handleCompute = () => {
    if (prereqMissing) { setError('请先完成步骤 C（确认粉料用量）'); return }

    try {
      const maa = maaStrengthPredict({
        dosages,
        temp:      Number(cureTemp),
        admixture,
      })

      const totalBinder = Object.values(dosages).reduce((s, v) => s + (v ?? 0), 0)
      const target      = fcu0(grade)
      const pass28d     = maa.strength[28] >= target

      // W/B check (requires design water from Step D)
      const wb = designWater && totalBinder ? Math.round(designWater / totalBinder * 1000) / 1000 : null

      // Safety constraints
      const checks = {
        wb:          { label: 'W/B ≤ 0.38',       pass: wb == null || wb <= 0.38,   value: wb ? `${wb}` : '(需完成步骤D)' },
        cement:      { label: '水泥 ≥ 80 kg/m³',  pass: dosages.cement >= 80,       value: `${dosages.cement} kg/m³` },
        totalBinder: { label: '总胶凝 ≥ 450 kg/m³', pass: totalBinder >= 450,       value: `${Math.round(totalBinder)} kg/m³` },
      }

      const res = { maa, target, pass28d, wb, totalBinder, checks, grade, cureTemp: Number(cureTemp), admixture }
      setResult(res)
      setError('')
      setDone(true)
      onResult({
        strength: maa.strength, target, pass: pass28d, grade, wb, checks,
        // include breakdown for report generation
        cBase: maa.C_base, scmBreakdown: maa.scmBreakdown,
      })
    } catch (e) {
      setError(e.message)
    }
  }

  const cellSx = { px: 1, py: 0.4, fontSize: 12 }
  const ageSx  = { fontWeight: 700, ...cellSx }

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
        E — 强度预测 (MAA)
      </Typography>

      {prereqMissing ? (
        <Typography variant="caption" color="text.secondary">请先完成步骤 C（确认粉料用量）</Typography>
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>混凝土标号 *</InputLabel>
              <Select value={grade} label="混凝土标号 *"
                onChange={e => { setGrade(e.target.value); setDone(false) }}>
                {GRADES.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField
              label="养护温度 (°C)"
              size="small"
              value={cureTemp}
              onChange={e => { setCureTemp(e.target.value); setDone(false) }}
              slotProps={{ htmlInput: { type: 'number', min: 5, max: 60 } }}
              sx={{ width: 120 }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>外加剂类型</InputLabel>
              <Select value={admixture} label="外加剂类型"
                onChange={e => { setAdmixture(e.target.value); setDone(false) }}>
                {ADMIXTURE_OPTS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            配制强度目标 f<sub>cu,0</sub> = {fcu0(grade)} MPa（{grade} + 1.645 × {SIGMA} MPa）
          </Typography>

          <Button variant={done ? 'outlined' : 'contained'} size="small" onClick={handleCompute}>
            预测强度
          </Button>
          {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}

          {done && result && (
            <Box sx={{ mt: 1.5 }}>
              {/* Strength table */}
              <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                预测强度 (MPa)
              </Typography>
              <Table size="small" sx={{ mb: 1.5, '& td, & th': cellSx }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>材料</TableCell>
                    <TableCell align="right">2d</TableCell>
                    <TableCell align="right">3d</TableCell>
                    <TableCell align="right" sx={{ ...ageSx, color: result.pass28d ? 'success.main' : 'error.main' }}>
                      28d
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Cement row */}
                  <TableRow>
                    <TableCell>{POWDER_NAMES.cement}</TableCell>
                    <TableCell align="right">{result.maa.C_base[2]}</TableCell>
                    <TableCell align="right">{result.maa.C_base[3]}</TableCell>
                    <TableCell align="right">{result.maa.C_base[28]}</TableCell>
                  </TableRow>
                  {/* SCM rows */}
                  {Object.entries(result.maa.scmBreakdown).map(([key, ages]) =>
                    (dosages[key] > 0) && (
                      <TableRow key={key}>
                        <TableCell>{POWDER_NAMES[key]}</TableCell>
                        <TableCell align="right">{ages[2]}</TableCell>
                        <TableCell align="right">{ages[3]}</TableCell>
                        <TableCell align="right">{ages[28]}</TableCell>
                      </TableRow>
                    )
                  )}
                  {/* Total row */}
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700 }}>合计</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{result.maa.strength[2]}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{result.maa.strength[3]}</TableCell>
                    <TableCell align="right"
                      sx={{ fontWeight: 700, color: result.pass28d ? 'success.main' : 'error.main' }}>
                      {result.maa.strength[28]}
                    </TableCell>
                  </TableRow>
                  {/* Target row */}
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>目标</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>{result.target}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Alert severity={result.pass28d ? 'success' : 'error'} sx={{ mb: 1.5, py: 0 }}>
                28d 预测 {result.maa.strength[28]} MPa {result.pass28d ? '≥' : '<'} 目标 {result.target} MPa
                &nbsp;—&nbsp;{result.pass28d ? '强度满足要求' : '强度不足，请增加胶凝材料或调整配比'}
              </Alert>

              <Divider sx={{ mb: 1 }} />

              {/* Safety checks */}
              <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.3 }}>
                安全约束检查
              </Typography>
              {Object.values(result.checks).map((c, i) => (
                <CheckRow key={i} label={c.label} pass={c.pass} value={c.value} />
              ))}
              {result.wb != null && result.wb > 0.38 && (
                <Alert severity="error" sx={{ mt: 0.5, py: 0 }}>
                  水胶比 {result.wb} 超过限值 0.38，建议增加胶凝材料用量或减少用水量
                </Alert>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
