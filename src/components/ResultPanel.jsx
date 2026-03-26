import {
  Paper, Typography, Box, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, Chip,
} from '@mui/material'

export default function ResultPanel({ fullerResult, aaResult, maaResult, error }) {
  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>计算结果</Typography>
        <Typography color="error">{error}</Typography>
      </Paper>
    )
  }

  if (!fullerResult) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>计算结果</Typography>
        <Typography variant="body2" color="text.secondary">点击「开始计算」后显示结果</Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>计算结果</Typography>

      {/* Fuller 骨架优化 */}
      <SectionTitle>① Fuller 骨架优化</SectionTitle>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
        <Stat label="最优砂率" value={`${(fullerResult.optimalSandRatio * 100).toFixed(1)} %`} />
        <Stat label="残差平方和 RSS" value={fullerResult.rss.toFixed(4)} />
      </Box>

      {aaResult && (
        <>
          <Divider sx={{ my: 1.5 }} />

          {/* A&A 浆体填充 */}
          <SectionTitle>② A&A 浆体填充</SectionTitle>
          <Box sx={{ mb: 1 }}>
            <Stat label="浆体体积" value={`${(aaResult.pasteVolume * 1000).toFixed(1)} L/m³`} />
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>粉体材料</TableCell>
                <TableCell align="right">体积占比</TableCell>
                <TableCell align="right">用量 (kg/m³)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {aaResult.dosages.map(({ name, volumeFraction, kg }) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell align="right">{(volumeFraction * 100).toFixed(1)} %</TableCell>
                  <TableCell align="right"><strong>{kg}</strong></TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>合计</strong></TableCell>
                <TableCell align="right">—</TableCell>
                <TableCell align="right">
                  <strong>{aaResult.dosages.reduce((s, d) => s + d.kg, 0).toFixed(1)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      )}

      {maaResult && (
        <>
          <Divider sx={{ my: 1.5 }} />

          {/* MAA 强度预测 */}
          <SectionTitle>③ MAA 强度预测</SectionTitle>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>龄期</TableCell>
                <TableCell align="right">水泥贡献</TableCell>
                <TableCell align="right">SCM 贡献</TableCell>
                <TableCell align="right">预测强度</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[2, 3, 28].map((t) => {
                const scm = (
                  (maaResult.scmBreakdown.flyAsh?.[t] ?? 0) +
                  (maaResult.scmBreakdown.ggbs?.[t] ?? 0) +
                  (maaResult.scmBreakdown.sf?.[t] ?? 0)
                ).toFixed(1)
                return (
                  <TableRow key={t}>
                    <TableCell>{t} 天</TableCell>
                    <TableCell align="right">{maaResult.C_base[t]} MPa</TableCell>
                    <TableCell align="right">{scm} MPa</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${maaResult.strength[t]} MPa`}
                        size="small"
                        color={t === 28 ? 'primary' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </>
      )}
    </Paper>
  )
}

function SectionTitle({ children }) {
  return (
    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
      {children}
    </Typography>
  )
}

function Stat({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1"><strong>{value}</strong></Typography>
    </Box>
  )
}
