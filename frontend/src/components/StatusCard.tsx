import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import type { StatusLevel } from '../types/common'

type StatusCardProps = {
  title: string
  value: string
  helper?: string
  trend?: number
  status?: StatusLevel
}

const statusMap: Record<StatusLevel, { color: 'default' | 'success' | 'warning' | 'error'; label: string }> = {
  normal: { color: 'success', label: '正常' },
  warning: { color: 'warning', label: '关注' },
  critical: { color: 'error', label: '受限' },
}

function TrendChip({ trend }: { trend: number }) {
  const isPositive = trend > 0
  const isZero = trend === 0

  if (isZero) {
    return <Chip label="持平" size="small" variant="outlined" />
  }

  return (
    <Chip
      size="small"
      color={isPositive ? 'success' : 'warning'}
      icon={isPositive ? <ArrowUpwardRoundedIcon /> : <ArrowDownwardRoundedIcon />}
      label={`${isPositive ? '+' : ''}${trend}%`}
      variant="outlined"
      sx={{ pl: 0.5 }}
    />
  )
}

export function StatusCard({ title, value, helper, trend, status = 'normal' }: StatusCardProps) {
  const badge = statusMap[status]

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Chip size="small" color={badge.color} label={badge.label} variant="outlined" />
        </Stack>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h4" component="div" sx={{ letterSpacing: -0.5 }}>
            {value}
          </Typography>
          {typeof trend === 'number' && <TrendChip trend={trend} />}
        </Box>
        {helper && (
          <Stack direction="row" spacing={1} alignItems="center">
            <InfoOutlinedIcon fontSize="small" color="disabled" />
            <Typography variant="body2" color="text.secondary">
              {helper}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}

export default StatusCard
