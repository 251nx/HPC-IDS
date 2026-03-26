import { useMemo, useState } from 'react'
import { Paper, Typography, TextField, Grid, Box, Divider, InputAdornment } from '@mui/material'
import { correctMoisture } from '../utils/moisture'

export default function MoistureAdapter({ aggregateMasses, designWater }) {
  const [sandMoisture,  setSandMoisture]  = useState(3)
  const [stoneMoisture, setStoneMoisture] = useState(1)

  const sandDryMass  = aggregateMasses?.sandDryMass  ?? 0
  const stoneDryMass = aggregateMasses?.stoneDryMass ?? 0
  const water        = designWater ?? 160

  const result = useMemo(() => {
    if (!sandDryMass && !stoneDryMass) {
      return null
    }

    return (
      correctMoisture({
        designWater: water,
        sandDryMass,
        sandMoisture: Number(sandMoisture),
        stoneDryMass,
        stoneMoisture: Number(stoneMoisture),
      })
    )
  }, [sandMoisture, stoneMoisture, sandDryMass, stoneDryMass, water])

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>含水率扣水</Typography>

      <Grid container spacing={1.5}>
        <Grid item xs={6}>
          <TextField
            label="砂含水率" type="number" size="small" fullWidth
            value={sandMoisture}
            onChange={(e) => setSandMoisture(e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 15, step: 0.1 }, input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="石含水率" type="number" size="small" fullWidth
            value={stoneMoisture}
            onChange={(e) => setStoneMoisture(e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 5, step: 0.1 }, input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
          />
        </Grid>
      </Grid>

      {result ? (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Grid container spacing={1}>
            <ResultRow label="砂实际投料量" value={`${result.sand.actualMass} kg/m³`} sub={`骨料带水 ${result.sand.waterCarried} kg`} />
            <ResultRow label="石实际投料量" value={`${result.stone.actualMass} kg/m³`} sub={`骨料带水 ${result.stone.waterCarried} kg`} />
            <ResultRow label="实际加水量"   value={`${result.actualWater} kg/m³`}       sub={`总带水 ${result.totalWaterCarried} kg`} highlight />
          </Grid>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          先完成计算后显示修正结果
        </Typography>
      )}
    </Paper>
  )
}

function ResultRow({ label, value, sub, highlight }) {
  return (
    <Grid item xs={12}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body1" color={highlight ? 'primary' : 'text.primary'} fontWeight={highlight ? 700 : 400}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">{sub}</Typography>
        </Box>
      </Box>
    </Grid>
  )
}
