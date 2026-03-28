import { Box, Typography, TextField, Stack } from '@mui/material'

export default function StepF_Feedback({ predictedStrength }) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
        F — 实验数据记录
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        输入实测强度（MPa），与预测值对比
      </Typography>
      <Stack direction="row" spacing={1}>
        {[2, 3, 28].map(t => (
          <TextField
            key={t}
            label={`${t}d 实测 (MPa)`}
            size="small"
            placeholder={predictedStrength?.[t] != null ? `预测: ${predictedStrength[t]}` : '—'}
            slotProps={{ htmlInput: { type: 'number', min: 0, step: 0.1 } }}
            sx={{ flex: 1 }}
          />
        ))}
      </Stack>
    </Box>
  )
}
