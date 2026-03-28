import { useState } from 'react'
import { Box, Typography, TextField, Button, Alert } from '@mui/material'
import { fullerCurve } from '../utils/fuller'

const ALL_SIEVES = [0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 9.5, 16, 19, 26.5, 31.5, 37.5]

export default function StepA_MaxSize({ onResult }) {
  const [dMax, setDMax] = useState('26.5')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleCompute = () => {
    const d = parseFloat(dMax)
    if (!d || d <= 0) { setError('请输入有效的最大粒径'); return }
    setError('')
    const sieves = ALL_SIEVES.filter(s => s <= d + 0.01)
    const curve = fullerCurve(d, sieves) // [{d, P}] P in %
    onResult({ dMax: d, fullerTheoryCurve: curve })
    setDone(true)
  }

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
        A — 最大粒径
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label="D_max (mm)"
          size="small"
          value={dMax}
          onChange={(e) => { setDMax(e.target.value); setDone(false) }}
          slotProps={{ htmlInput: { type: 'number', min: 4.75, step: 0.5 } }}
          sx={{ width: 140 }}
        />
        <Button variant={done ? 'outlined' : 'contained'} size="small" onClick={handleCompute} sx={{ mt: 0.3 }}>
          生成 Fuller 曲线
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
      {done && <Alert severity="success" sx={{ mt: 1, py: 0 }}>Fuller 理论曲线已生成，D_max = {dMax} mm</Alert>}
    </Box>
  )
}
