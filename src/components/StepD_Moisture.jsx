import { useState } from 'react'
import { Box, Typography, TextField, Button, Alert, Stack } from '@mui/material'
import { correctMoisture } from '../utils/moisture'

export default function StepD_Moisture({ sandDryMass, stoneDryMass, onResult }) {
  const [designWater, setDesignWater] = useState('160')
  const [sandMoisture,  setSandMoisture]  = useState('3')
  const [stoneMoisture, setStoneMoisture] = useState('1')
  const [error, setError] = useState('')
  const [done,  setDone]  = useState(false)
  const [result, setResult] = useState(null)

  const prereqMissing = sandDryMass == null || stoneDryMass == null

  const handleCompute = () => {
    const dw  = Number(designWater)
    const sm  = Number(sandMoisture)
    const stm = Number(stoneMoisture)

    if (!dw || dw <= 0) { setError('设计用水量为必填项，且必须 > 0'); return }
    if (prereqMissing)  { setError('请先完成步骤 C（骨料用量）'); return }

    const corr = correctMoisture({
      designWater: dw,
      sandDryMass,
      sandMoisture: sm,
      stoneDryMass,
      stoneMoisture: stm,
    })
    const out = { ...corr, designWater: dw, sandDryMass, stoneDryMass }
    setResult(out)
    setError('')
    setDone(true)
    onResult(out)
  }

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
        D — 含水率修正
      </Typography>

      {prereqMissing ? (
        <Typography variant="caption" color="text.secondary">请先完成步骤 C（骨料用量）</Typography>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            砂干料 {sandDryMass} kg/m³，石干料 {stoneDryMass} kg/m³
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <TextField
              label={<>设计用水 (kg/m³)<Typography component="span" color="error.main"> *</Typography></>}
              size="small"
              value={designWater}
              onChange={e => { setDesignWater(e.target.value); setDone(false) }}
              error={designWater !== '' && Number(designWater) <= 0}
              slotProps={{ htmlInput: { type: 'number', min: 100, max: 250 } }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="砂含水率 (%)"
              size="small"
              value={sandMoisture}
              onChange={e => { setSandMoisture(e.target.value); setDone(false) }}
              slotProps={{ htmlInput: { type: 'number', min: 0, max: 20, step: 0.1 } }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="石含水率 (%)"
              size="small"
              value={stoneMoisture}
              onChange={e => { setStoneMoisture(e.target.value); setDone(false) }}
              slotProps={{ htmlInput: { type: 'number', min: 0, max: 10, step: 0.1 } }}
              sx={{ flex: 1 }}
            />
          </Stack>
          <Button variant={done ? 'outlined' : 'contained'} size="small" onClick={handleCompute}>
            计算含水修正
          </Button>
          {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
          {done && result && (
            <Alert severity="success" sx={{ mt: 1, py: 0 }}>
              实际加水量 {result.actualWater} kg/m³（骨料携带水 {result.totalWaterCarried} kg）
            </Alert>
          )}
        </>
      )}
    </Box>
  )
}
