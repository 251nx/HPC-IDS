import { useState } from 'react'
import {
  Paper, Typography, TextField, Slider, Button,
  Accordion, AccordionSummary, AccordionDetails,
  Grid, Box, Divider, InputAdornment,
  FormGroup, FormControlLabel, Checkbox, MenuItem,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

const SIEVES = [0.075, 0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 9.5, 16, 19, 26.5, 31.5, 37.5]
const emptyPSD = () => SIEVES.map((d) => ({ d, P: '' }))

const ADMIXTURE_OPTIONS = [
  { value: 'none',  label: '无' },
  { value: 'typeA', label: 'A 型（早强型）' },
  { value: 'typeB', label: 'B 型（后期增强型）' },
  { value: 'typeC', label: 'C 型（综合型）' },
]

const POWDER_OPTIONS = [
  { key: 'flyAsh', label: '粉煤灰' },
  { key: 'ggbs',   label: '矿渣粉' },
  { key: 'sf',     label: '硅灰' },
]

export default function MaterialInputForm({ onCalculate }) {
  const [sandPSD,  setSandPSD]  = useState(emptyPSD)
  const [stonePSD, setStonePSD] = useState(emptyPSD)
  const [dMax,     setDMax]     = useState(26.5)
  const [q,        setQ]        = useState(0.25)

  // 配比参数
  const [water,      setWater]      = useState(160)
  const [voidRatio,  setVoidRatio]  = useState(0.38)
  const [temp,       setTemp]       = useState(20)
  const [admixture,  setAdmixture]  = useState('none')
  const [powders,    setPowders]    = useState({ flyAsh: false, ggbs: false, sf: false })

  const handlePSDChange = (setter, index, value) => {
    setter((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], P: value }
      return next
    })
  }

  const handlePowderToggle = (key) => {
    setPowders((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleCalculate = () => {
    const clean = (psd) => psd.map(({ d, P }) => ({ d, P: P === '' ? 0 : Number(P) }))
    const selectedPowders = ['cement', ...Object.keys(powders).filter((k) => powders[k])]
    onCalculate?.({
      sandPSD: clean(sandPSD),
      stonePSD: clean(stonePSD),
      dMax: Number(dMax),
      q: Number(q),
      water: Number(water),
      voidRatio: Number(voidRatio),
      temp: Number(temp),
      admixture,
      selectedPowders,
    })
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>原材料输入</Typography>

      {/* 砂筛分 */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">砂的筛分数据</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <PSDInputGrid psd={sandPSD} onChange={(i, v) => handlePSDChange(setSandPSD, i, v)} />
        </AccordionDetails>
      </Accordion>

      {/* 石子筛分 */}
      <Accordion defaultExpanded sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">石子的筛分数据</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <PSDInputGrid psd={stonePSD} onChange={(i, v) => handlePSDChange(setStonePSD, i, v)} />
        </AccordionDetails>
      </Accordion>

      {/* 配比参数 */}
      <Accordion defaultExpanded sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">配比参数</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <TextField
                label="最大粒径 D_max" type="number" size="small" fullWidth
                value={dMax} onChange={(e) => setDMax(e.target.value)}
                slotProps={{ htmlInput: { min: 4.75, max: 37.5, step: 0.5 }, input: { endAdornment: <InputAdornment position="end">mm</InputAdornment> } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="骨架空隙率" type="number" size="small" fullWidth
                value={voidRatio} onChange={(e) => setVoidRatio(e.target.value)}
                slotProps={{ htmlInput: { min: 0.25, max: 0.55, step: 0.01 } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="设计水用量" type="number" size="small" fullWidth
                value={water} onChange={(e) => setWater(e.target.value)}
                slotProps={{ htmlInput: { min: 100, max: 250, step: 1 }, input: { endAdornment: <InputAdornment position="end">kg/m³</InputAdornment> } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="养护温度" type="number" size="small" fullWidth
                value={temp} onChange={(e) => setTemp(e.target.value)}
                slotProps={{ htmlInput: { min: 5, max: 60, step: 1 }, input: { endAdornment: <InputAdornment position="end">°C</InputAdornment> } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="增强剂品牌" select size="small" fullWidth
                value={admixture} onChange={(e) => setAdmixture(e.target.value)}
              >
                {ADMIXTURE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>辅助胶凝材料（SCM）</Typography>
              <FormGroup row>
                {POWDER_OPTIONS.map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        size="small"
                        checked={powders[key]}
                        onChange={() => handlePowderToggle(key)}
                      />
                    }
                    label={label}
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5 }} />

          {/* q 值滑块 */}
          <Box sx={{ px: 1 }}>
            <Typography variant="body2" gutterBottom>
              分布模数 q：<strong>{q}</strong>
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                （0.22 自密实 ← → 0.37 高密实）
              </Typography>
            </Typography>
            <Slider
              value={q} onChange={(_, v) => setQ(v)}
              min={0.22} max={0.37} step={0.01}
              marks={[
                { value: 0.22, label: '0.22' },
                { value: 0.25, label: '0.25' },
                { value: 0.30, label: '0.30' },
                { value: 0.37, label: '0.37' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleCalculate}>
        开始计算
      </Button>
    </Paper>
  )
}

function PSDInputGrid({ psd, onChange }) {
  return (
    <Grid container spacing={1}>
      {psd.map(({ d, P }, i) => (
        <Grid item xs={6} sm={4} key={d}>
          <TextField
            label={`${d} mm`} type="number" size="small" fullWidth
            value={P} onChange={(e) => onChange(i, e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 0.1 }, input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
          />
        </Grid>
      ))}
    </Grid>
  )
}
