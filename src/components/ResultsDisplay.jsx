import { Box, Typography, Divider, Stack } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon       from '@mui/icons-material/ErrorOutline'

function Row({ label, value, unit = '', bold, color }) {
  const display = (value != null && value !== '') ? `${value}${unit ? ' ' + unit : ''}` : '—'
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.35, px: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" fontWeight={bold ? 700 : 400} color={color ?? 'text.primary'}>
        {display}
      </Typography>
    </Stack>
  )
}

function Section({ title, children }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ px: 1, fontSize: 10, color: 'text.secondary', lineHeight: 1.8 }}>
        {title}
      </Typography>
      {children}
      <Divider sx={{ mt: 0.5 }} />
    </Box>
  )
}

function SafeRow({ label, pass, value }) {
  if (pass == null) return <Row label={label} value={value} />
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.35, px: 1 }}>
      <Stack direction="row" alignItems="center" spacing={0.3}>
        {pass
          ? <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main', fontSize: 14 }} />
          : <ErrorOutlineIcon       fontSize="small" sx={{ color: 'error.main',   fontSize: 14 }} />
        }
        <Typography variant="caption" color={pass ? 'success.main' : 'error.main'}>{label}</Typography>
      </Stack>
      <Typography variant="caption" color={pass ? 'success.main' : 'error.main'}>{value ?? '—'}</Typography>
    </Stack>
  )
}

const POWDER_LABELS = { cement: '水泥', flyAsh: '粉煤灰', ggbs: '矿渣粉', sf: '硅灰' }

export default function ResultsDisplay({ results }) {
  const r = results ?? {}

  const totalBinder = r.dosages
    ? Math.round(Object.values(r.dosages).reduce((s, v) => s + (v ?? 0), 0))
    : null

  const wb = r.designWater && totalBinder
    ? Math.round(r.designWater / totalBinder * 1000) / 1000
    : null

  const checks = r.checks // from StepE

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 1, py: 0.8, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="subtitle2" fontWeight={700}>配合比汇总 (kg/m³)</Typography>
      </Box>

      <Section title="骨架优化 (Fuller)">
        <Row label="最大粒径 D_max" value={r.dMax} unit="mm" />
        <Row label="最优砂率" value={r.optimalSandRatio != null ? `${Math.round(r.optimalSandRatio * 1000) / 10}%` : null} />
        <Row label="细度模数 FM" value={r.fm} />
      </Section>

      <Section title="胶凝材料 (kg/m³)">
        {r.dosages
          ? Object.entries(r.dosages).map(([key, kg]) =>
              kg > 0 && <Row key={key} label={POWDER_LABELS[key]} value={Math.round(kg)} unit="kg/m³" />
            )
          : <Row label="（步骤 C 完成后显示）" />
        }
        <Row label="总胶凝材料" value={totalBinder} unit="kg/m³" bold />
      </Section>

      <Section title="骨料 (kg/m³)">
        <Row label="砂干料" value={r.sandDryMass} unit="kg/m³" />
        <Row label="石子干料" value={r.stoneDryMass} unit="kg/m³" />
        <Row label="砂投料（湿）" value={r.sand?.actualMass} unit="kg/m³" />
        <Row label="石子投料（湿）" value={r.stone?.actualMass} unit="kg/m³" />
      </Section>

      <Section title="用水量 (kg/m³)">
        <Row label="设计用水量" value={r.designWater} unit="kg/m³" />
        <Row label="骨料携带水" value={r.totalWaterCarried} unit="kg/m³" />
        <Row label="实际加水量" value={r.actualWater} unit="kg/m³" bold />
        <Row
          label="水胶比 W/B"
          value={wb}
          bold
          color={wb != null ? (wb <= 0.38 ? 'success.main' : 'error.main') : undefined}
        />
      </Section>

      <Section title="安全约束">
        <SafeRow
          label="W/B ≤ 0.38"
          pass={wb != null ? wb <= 0.38 : null}
          value={wb != null ? `${wb}` : '(需完成步骤 D)'}
        />
        <SafeRow
          label="水泥 ≥ 80 kg/m³"
          pass={r.dosages?.cement != null ? r.dosages.cement >= 80 : null}
          value={r.dosages?.cement != null ? `${Math.round(r.dosages.cement)} kg/m³` : null}
        />
        <SafeRow
          label="总胶凝 ≥ 450 kg/m³"
          pass={totalBinder != null ? totalBinder >= 450 : null}
          value={totalBinder != null ? `${totalBinder} kg/m³` : null}
        />
      </Section>

      <Section title="强度预测 (MAA)">
        <Row label="目标标号 / 配制强度" value={r.grade && r.target ? `${r.grade} → ${r.target} MPa` : null} />
        <Row label="2d 预测" value={r.strength?.[2]}  unit="MPa" />
        <Row label="3d 预测" value={r.strength?.[3]}  unit="MPa" />
        <Row
          label="28d 预测"
          value={r.strength?.[28]}
          unit="MPa"
          bold
          color={
            r.strength?.[28] != null && r.target != null
              ? r.strength[28] >= r.target ? 'success.main' : 'error.main'
              : undefined
          }
        />
      </Section>
    </Box>
  )
}
