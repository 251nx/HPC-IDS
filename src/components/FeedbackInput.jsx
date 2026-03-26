import { useState } from 'react'
import {
  Paper, Typography, TextField, Button, Grid,
  InputAdornment, Divider, Box, Chip,
} from '@mui/material'
import { maaCalibrate } from '../utils/maa'

export default function FeedbackInput({ dosages, temp, admixture, kOverride, onCalibrate }) {
  const [measured, setMeasured] = useState({ 2: '', 3: '', 28: '' })
  const [corrections, setCorrections] = useState(null)

  const handleCalibrate = () => {
    if (!dosages) return
    const measuredClean = Object.fromEntries(
      Object.entries(measured)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => [k, Number(v)])
    )
    if (Object.keys(measuredClean).length === 0) return

    const { kAdjusted, corrections: corr } = maaCalibrate({
      measured: measuredClean,
      dosages,
      temp: temp ?? 20,
      admixture: admixture ?? 'none',
      kCurrent: kOverride,
    })
    setCorrections(corr)
    onCalibrate?.(kAdjusted)
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>实验反馈</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        输入实测强度，反向修正 MAA 模型 K 系数
      </Typography>

      <Grid container spacing={1.5}>
        {[2, 3, 28].map((t) => (
          <Grid item xs={4} key={t}>
            <TextField
              label={`${t} 天实测`} type="number" size="small" fullWidth
              value={measured[t]}
              onChange={(e) => setMeasured((prev) => ({ ...prev, [t]: e.target.value }))}
              slotProps={{ htmlInput: { min: 0, max: 200, step: 0.1 }, input: { endAdornment: <InputAdornment position="end">MPa</InputAdornment> } }}
            />
          </Grid>
        ))}
      </Grid>

      <Button
        variant="outlined" fullWidth sx={{ mt: 1.5 }}
        onClick={handleCalibrate}
        disabled={!dosages}
      >
        修正 K 系数
      </Button>

      {!dosages && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          先完成主计算后可进行反馈修正
        </Typography>
      )}

      {corrections && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="body2" gutterBottom>修正比例（实测 / 预测）：</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(corrections).map(([age, ratio]) => (
              <Chip
                key={age}
                label={`${age}天：×${ratio}`}
                size="small"
                color={ratio > 1 ? 'success' : ratio < 1 ? 'warning' : 'default'}
              />
            ))}
          </Box>
        </>
      )}
    </Paper>
  )
}
