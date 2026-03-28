import { useState } from 'react'
import {
  Box, Typography, Slider, Button, Alert, Stack, Divider,
  FormControlLabel, Checkbox, Collapse, TextField, Table,
  TableHead, TableBody, TableRow, TableCell,
} from '@mui/material'
import { aaFilling } from '../utils/aa'
import { POWDER_SIEVES, STANDARD_POWDER_PSD } from '../utils/powderPSD'

const AGGREGATE_DENSITY = 2650  // kg/m³ particle density
const AIR_CONTENT = 0.02        // m³/m³

const POWDER_OPTIONS = [
  { key: 'cement', label: '水泥', required: true },
  { key: 'flyAsh', label: '粉煤灰' },
  { key: 'ggbs',   label: '矿渣粉' },
  { key: 'sf',     label: '硅灰' },
]

const NAME_TO_KEY = { '水泥': 'cement', '粉煤灰': 'flyAsh', '矿渣粉': 'ggbs', '硅灰': 'sf' }

const POWDER_SIEVES_LABELS = POWDER_SIEVES.map(d => {
  const um = d * 1000
  return um >= 1 ? `${Math.round(um * 10) / 10}μm` : `${Math.round(um * 1000)}nm`
})

function initPSD(key) {
  return Object.fromEntries(
    STANDARD_POWDER_PSD[key].psd.map(({ d, P }) => [d, String(Math.round(P * 100))])
  )
}

function buildCustomPowder(key, psdState) {
  return {
    ...STANDARD_POWDER_PSD[key],
    psd: POWDER_SIEVES.map(d => ({
      d,
      P: Math.min(1, Math.max(0, Number(psdState[d] ?? '0') / 100)),
    })),
  }
}

export default function StepC_Powder({ dMax, optimalSandRatio, onResult }) {
  // ── Aggregate dosages (at top, required) ─────────────────────────────────
  const [sandMass,  setSandMass]  = useState('')
  const [stoneMass, setStoneMass] = useState('')

  // ── Powder setup ──────────────────────────────────────────────────────────
  const [q, setQ] = useState(0.25)
  const [selected,   setSelected]   = useState({ cement: true, flyAsh: false, ggbs: false, sf: false })
  const [customMode, setCustomMode] = useState({ cement: false, flyAsh: false, ggbs: false, sf: false })
  const [psdState,   setPsdState]   = useState({
    cement: initPSD('cement'), flyAsh: initPSD('flyAsh'),
    ggbs:   initPSD('ggbs'),   sf:     initPSD('sf'),
  })

  // ── Powder dosages (kg/m³) — auto-filled by A&A, user-editable ───────────
  const [powderDosages, setPowderDosages] = useState({ cement: '', flyAsh: '', ggbs: '', sf: '' })

  const [aaRan,  setAaRan]  = useState(false)
  const [error,  setError]  = useState('')
  const [done,   setDone]   = useState(false)

  const togglePowder = (key) => {
    if (key === 'cement') return
    setSelected(p => ({ ...p, [key]: !p[key] }))
    setDone(false)
  }
  const toggleCustom = (key) => {
    setCustomMode(p => ({ ...p, [key]: !p[key] }))
  }
  const updatePSD = (key, d, v) => {
    setPsdState(p => ({ ...p, [key]: { ...p[key], [d]: v } }))
  }
  const updatePowder = (key, v) => {
    setPowderDosages(p => ({ ...p, [key]: v }))
    setDone(false)
  }

  // Suggest aggregate masses from sand ratio and A&A paste volume
  const suggestAggregates = (pasteVol) => {
    if (optimalSandRatio == null) return
    const aggVol   = Math.max(0, 1 - AIR_CONTENT - pasteVol)
    const totalAgg = Math.round(aggVol * AGGREGATE_DENSITY)
    if (!sandMass)  setSandMass(String(Math.round(totalAgg * optimalSandRatio)))
    if (!stoneMass) setStoneMass(String(Math.round(totalAgg * (1 - optimalSandRatio))))
  }

  const handleRunAA = () => {
    if (!dMax) { setError('请先完成步骤 A（输入最大粒径）'); return }
    try {
      const selectedKeys = POWDER_OPTIONS.filter(o => selected[o.key]).map(o => o.key)
      const powders = selectedKeys.map(k =>
        customMode[k] ? buildCustomPowder(k, psdState[k]) : STANDARD_POWDER_PSD[k]
      )
      const aa = aaFilling({ skeletonVoidRatio: 0.38, dMax, q, powders })

      // Fill in suggested powder dosages (don't overwrite user-edited values)
      const newDosages = { ...powderDosages }
      aa.dosages.forEach(({ name, kg }) => {
        const k = NAME_TO_KEY[name]
        if (k && !powderDosages[k]) newDosages[k] = String(Math.round(kg))
      })
      // Clear deselected powders
      POWDER_OPTIONS.forEach(({ key }) => {
        if (!selected[key]) newDosages[key] = ''
      })
      setPowderDosages(newDosages)
      suggestAggregates(aa.pasteVolume)
      setAaRan(true)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleConfirm = () => {
    // Validate aggregate dosages
    const sand  = Number(sandMass)
    const stone = Number(stoneMass)
    if (!sand  || sand  <= 0) { setError('砂干料用量为必填项，且必须 > 0 kg/m³'); return }
    if (!stone || stone <= 0) { setError('石干料用量为必填项，且必须 > 0 kg/m³'); return }

    // Build dosage map from editable fields
    const dosageMap = {}
    POWDER_OPTIONS.forEach(({ key }) => {
      if (selected[key]) {
        const v = Number(powderDosages[key])
        if (!v || v <= 0) { setError(`${POWDER_OPTIONS.find(o=>o.key===key).label}用量为必填项，且必须 > 0`); return }
        dosageMap[key] = v
      }
    })
    if (!dosageMap.cement) { setError('水泥用量为必填项'); return }

    setError('')
    setDone(true)
    onResult({ sandDryMass: sand, stoneDryMass: stone, dosages: dosageMap })
  }

  const cellSx = { px: 0.5, py: 0.3, fontSize: 11 }

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
        C — 骨料与粉料用量
      </Typography>

      {/* ── 1. Aggregate dosages ── */}
      <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
        骨料干料用量 (kg/m³)
        <Typography component="span" color="error.main"> *</Typography>
        {optimalSandRatio == null && (
          <Typography component="span" color="text.secondary"> — 步骤 B 完成后可自动推算</Typography>
        )}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          label="砂 (kg/m³) *"
          size="small"
          value={sandMass}
          onChange={e => { setSandMass(e.target.value); setDone(false) }}
          error={sandMass !== '' && Number(sandMass) <= 0}
          helperText={sandMass !== '' && Number(sandMass) <= 0 ? '必须 > 0' : ''}
          slotProps={{ htmlInput: { type: 'number', min: 1 } }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="石子 (kg/m³) *"
          size="small"
          value={stoneMass}
          onChange={e => { setStoneMass(e.target.value); setDone(false) }}
          error={stoneMass !== '' && Number(stoneMass) <= 0}
          helperText={stoneMass !== '' && Number(stoneMass) <= 0 ? '必须 > 0' : ''}
          slotProps={{ htmlInput: { type: 'number', min: 1 } }}
          sx={{ flex: 1 }}
        />
      </Stack>

      <Divider sx={{ mb: 1.5 }} />

      {/* ── 2. Powder selection + custom PSD ── */}
      <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
        粉料类型选择
      </Typography>
      {POWDER_OPTIONS.map(({ key, label, required }) => (
        <Box key={key} sx={{ mb: 0.5 }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap">
            <FormControlLabel
              control={
                <Checkbox size="small" checked={selected[key]} disabled={required}
                  onChange={() => togglePowder(key)} />
              }
              label={
                <Typography variant="body2">
                  {label}{required && <Typography component="span" color="error.main"> *</Typography>}
                </Typography>
              }
              sx={{ mr: 0.5 }}
            />
            {selected[key] && (
              <FormControlLabel
                control={
                  <Checkbox size="small" checked={customMode[key]} onChange={() => toggleCustom(key)} />
                }
                label={<Typography variant="caption" color="text.secondary">自定义 PSD</Typography>}
                sx={{ ml: 0 }}
              />
            )}
          </Stack>

          <Collapse in={selected[key] && customMode[key]}>
            <Box sx={{ ml: 2, mb: 1, overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 'max-content' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={cellSx}>粒径</TableCell>
                    {POWDER_SIEVES_LABELS.map((lbl, i) => (
                      <TableCell key={i} sx={{ ...cellSx, width: 52 }}>{lbl}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={cellSx}>通过率 (%)</TableCell>
                    {POWDER_SIEVES.map(d => (
                      <TableCell key={d} sx={cellSx}>
                        <TextField
                          size="small"
                          value={psdState[key][d] ?? ''}
                          onChange={e => updatePSD(key, d, e.target.value)}
                          sx={{ width: 48, '& input': { textAlign: 'center', p: '2px 4px', fontSize: 11 } }}
                          slotProps={{ htmlInput: { type: 'number', min: 0, max: 100 } }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </Box>
      ))}

      {/* ── 3. q slider + A&A button ── */}
      <Box sx={{ mt: 1, mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          分布模数 q = {q.toFixed(2)}（0.22 细浆多 ↔ 0.36 骨料多）
        </Typography>
        <Slider
          value={q} min={0.22} max={0.36} step={0.01} size="small"
          onChange={(_, v) => setQ(v)}
          marks={[{ value: 0.25, label: '0.25' }, { value: 0.30, label: '0.30' }]}
        />
      </Box>
      <Button variant="outlined" size="small" onClick={handleRunAA} sx={{ mb: 1.5 }}>
        运行 A&A（自动推算粉料用量）
      </Button>
      {aaRan && <Alert severity="info" sx={{ mb: 1, py: 0 }}>A&A 建议值已填入，可手动修改</Alert>}

      <Divider sx={{ mb: 1.5 }} />

      {/* ── 4. Powder dosages (editable) ── */}
      <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
        粉料用量 (kg/m³)<Typography component="span" color="error.main"> *</Typography>
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        {POWDER_OPTIONS.filter(o => selected[o.key]).map(({ key, label }) => (
          <TextField
            key={key}
            label={`${label} (kg/m³) *`}
            size="small"
            value={powderDosages[key]}
            onChange={e => updatePowder(key, e.target.value)}
            error={powderDosages[key] !== '' && Number(powderDosages[key]) <= 0}
            helperText={powderDosages[key] !== '' && Number(powderDosages[key]) <= 0 ? '必须 > 0' : ''}
            slotProps={{ htmlInput: { type: 'number', min: 1 } }}
            sx={{ width: 130 }}
          />
        ))}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1, py: 0 }}>{error}</Alert>}
      <Button
        variant={done ? 'outlined' : 'contained'}
        size="small"
        onClick={handleConfirm}
      >
        确认配比
      </Button>
      {done && <Alert severity="success" sx={{ mt: 1, py: 0 }}>配比已确认，可继续步骤 D / E</Alert>}
    </Box>
  )
}
