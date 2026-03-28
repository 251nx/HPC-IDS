import { useState } from 'react'
import {
  Box, Typography, TextField, Button, Alert,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material'
import { fullerOptimization } from '../utils/fuller'

// Standard sieve series (mm), large→small
export const STANDARD_SIEVES = [75, 63, 50, 37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15, 0.075]

// Sand: sieves ≤ 9.5 mm
const SAND_SIEVES = [9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15, 0.075]
// Stone: sieves ≥ 4.75 mm
const STONE_SIEVES_ALL = [75, 63, 50, 37.5, 25, 19, 12.5, 9.5, 4.75]

const FM_SIEVES = [4.75, 2.36, 1.18, 0.6, 0.3, 0.15]

// Typical defaults (cumulative passing %)
const DEFAULT_SAND  = { 9.5: 100, 4.75: 97, 2.36: 84, 1.18: 68, 0.6: 42, 0.3: 23, 0.15: 8, 0.075: 2 }
const DEFAULT_STONE = { 37.5: 100, 25: 100, 19: 72, 12.5: 40, 9.5: 18, 4.75: 4 }

// Log-linear interpolation; returns 0 below min, 100 above max
function interpolateP(d, known) {
  if (!known.length) return 0
  if (d <= known[0].d) return 0
  if (d >= known[known.length - 1].d) return 100
  for (let i = 0; i < known.length - 1; i++) {
    const lo = known[i], hi = known[i + 1]
    if (d >= lo.d && d <= hi.d) {
      const t = (Math.log(d) - Math.log(lo.d)) / (Math.log(hi.d) - Math.log(lo.d))
      return lo.P + t * (hi.P - lo.P)
    }
  }
  return 100
}

function parseKnown(dataMap) {
  return Object.entries(dataMap)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([d, v]) => ({ d: Number(d), P: Number(v) }))
    .filter(p => !isNaN(p.P) && p.P >= 0 && p.P <= 100)
    .sort((a, b) => a.d - b.d)
}

function calcFM(sandKnown) {
  return Math.round(
    FM_SIEVES.reduce((s, d) => s + (100 - interpolateP(d, sandKnown)), 0) / 100 * 100
  ) / 100
}

// Compact horizontal table for one material
function SieveRow({ sieves, data, onChange, label, required, hint }) {
  const cellSx = { px: 0.5, py: 0.4, fontSize: 11, textAlign: 'center', border: '1px solid', borderColor: 'divider' }
  return (
    <Box sx={{ mb: 1.5, overflowX: 'auto' }}>
      <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.4 }}>
        {label}
        {required && <Typography component="span" color="error.main"> *</Typography>}
        {hint && <Typography component="span" color="text.secondary" variant="caption"> — {hint}</Typography>}
      </Typography>
      <Table size="small" sx={{ minWidth: 'max-content' }}>
        <TableHead>
          <TableRow>
            {sieves.map(d => (
              <TableCell key={d} sx={{ ...cellSx, bgcolor: 'grey.50', fontWeight: 600, width: 58 }}>
                {d}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            {sieves.map(d => (
              <TableCell key={d} sx={{ ...cellSx, p: 0.3 }}>
                <TextField
                  size="small"
                  variant="standard"
                  value={data[d] ?? ''}
                  onChange={e => onChange(d, e.target.value)}
                  placeholder="—"
                  slotProps={{
                    htmlInput: {
                      type: 'number', min: 0, max: 100, step: 1,
                      style: { textAlign: 'center', padding: '2px 0', fontSize: 12, width: 48 },
                    },
                    input: { disableUnderline: false },
                  }}
                />
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  )
}

export default function StepB_Sieve({ dMax, onResult }) {
  const [sandData,  setSandData]  = useState({ ...DEFAULT_SAND })
  const [stoneData, setStoneData] = useState({ ...DEFAULT_STONE })
  const [error,  setError]  = useState('')
  const [info,   setInfo]   = useState('')
  const [done,   setDone]   = useState(false)

  const stoneSieves = STONE_SIEVES_ALL.filter(s => s <= (dMax ?? 100) + 0.01)

  const updateSand  = (d, v) => { setSandData(p => ({ ...p, [d]: v }));  setDone(false) }
  const updateStone = (d, v) => { setStoneData(p => ({ ...p, [d]: v })); setDone(false) }

  const handleCompute = () => {
    if (!dMax) { setError('请先完成步骤 A（输入最大粒径）'); return }

    const sandKnown  = parseKnown(sandData)
    const stoneKnown = parseKnown(stoneData)

    const sandFine   = sandKnown.filter(p => p.d <= 4.75 + 0.01)
    const stoneCoarse = stoneKnown.filter(p => p.d >= 4.75 - 0.01)

    if (sandFine.length < 2) {
      setError('砂 — 4.75 mm 及以下至少需要 2 个有效数据点')
      return
    }
    if (stoneCoarse.length < 2) {
      setError('石子 — 4.75 mm 及以上至少需要 2 个有效数据点')
      return
    }

    // Build unified PSD at all standard sieves ≤ dMax
    const sieves = STANDARD_SIEVES.filter(s => s <= dMax + 0.01).reverse() // small → large for interpolation

    const sandPSD  = sieves.map(d => ({ d, P: interpolateP(d, sandKnown) }))
    const stonePSD = sieves.map(d => ({ d, P: interpolateP(d, stoneKnown) }))

    try {
      const result = fullerOptimization({ sandPSD, stonePSD, dMax })
      const fm = calcFM(sandKnown)

      setError('')
      setInfo(`细度模数 FM = ${fm}，最优砂率 ${Math.round(result.optimalSandRatio * 1000) / 10}%`)
      setDone(true)

      onResult({
        optimalSandRatio:  result.optimalSandRatio,
        sandPSD,
        stonePSD,
        blendedPSD:        result.blendedCurve,
        fullerTheoryCurve: result.theoreticalCurve,
        fm,
        rss: result.rss,
      })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
        B — 砂石筛分数据
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          累计通过率 (%)，留空自动插值
        </Typography>
      </Typography>

      <SieveRow
        sieves={SAND_SIEVES}
        data={sandData}
        onChange={updateSand}
        label="砂 (mm)"
        required
        hint="≤ 4.75 mm 至少 2 个数据点"
      />

      <SieveRow
        sieves={stoneSieves}
        data={stoneData}
        onChange={updateStone}
        label="石子 (mm)"
        required
        hint="≥ 4.75 mm 至少 2 个数据点"
      />

      <Button variant={done ? 'outlined' : 'contained'} size="small" onClick={handleCompute}>
        计算砂石比 + 显示曲线
      </Button>
      {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
      {done  && <Alert severity="success" sx={{ mt: 1, py: 0 }}>{info}</Alert>}
    </Box>
  )
}
