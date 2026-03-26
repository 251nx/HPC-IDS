import { Paper, Typography, Alert, Box } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

export default function SafetyAlert({ validation }) {
  if (!validation) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>安全约束</Typography>
        <Typography variant="body2" color="text.secondary">水胶比、水泥用量、总粉体用量校验</Typography>
      </Paper>
    )
  }

  const { valid, waterBinderRatio, alerts } = validation

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6">安全约束</Typography>
        <Typography variant="body2" color="text.secondary">
          当前水胶比：<strong>{waterBinderRatio}</strong>
        </Typography>
      </Box>

      {valid && alerts.length === 0 && (
        <Alert icon={<CheckCircleOutlineIcon />} severity="success">
          所有安全约束均满足，配比可用。
        </Alert>
      )}

      {alerts.map((a, i) => (
        <Alert key={i} severity={a.severity} sx={{ mb: 0.5 }}>
          {a.message}
        </Alert>
      ))}
    </Paper>
  )
}
