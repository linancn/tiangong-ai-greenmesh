import EnergySavingsLeafRoundedIcon from '@mui/icons-material/EnergySavingsLeafRounded'
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import { Chip, Paper, Stack, Typography } from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import { useQuery } from '@tanstack/react-query'
import { LineChart } from '@mui/x-charts/LineChart'
import { useTheme } from '@mui/material/styles'
import { fetchCarbonSummaries, fetchCarbonTrend } from '../../api/mockClient'

function CarbonPage() {
  const { data: summaries = [] } = useQuery({
    queryKey: ['carbon', 'summaries'],
    queryFn: fetchCarbonSummaries,
  })
  const { data: trend = [] } = useQuery({
    queryKey: ['carbon', 'trend'],
    queryFn: fetchCarbonTrend,
  })
  const theme = useTheme()

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {summaries.map((item) => (
          <Grid item xs={12} md={4} key={item.id}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                height: '100%',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <EnergySavingsLeafRoundedIcon color="primary" />
                <Typography variant="subtitle1">{item.boundary}</Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="h5">{item.intensity}</Typography>
                <Typography variant="body2" color="text.secondary">
                  排放因子：{item.factor}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  更新：{item.updatedAt}
                </Typography>
                {item.note && (
                  <Typography variant="body2" color="text.secondary">
                    {item.note}
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          p: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <TrendingDownRoundedIcon color="primary" />
          <Typography variant="h6">周度碳排放趋势（可复算）</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2}>
          统一口径与因子版本，生成碳账本；支持按时间点回放与复算。
        </Typography>
        <LineChart
          height={320}
          dataset={trend}
          xAxis={[{ scaleType: 'point', dataKey: 'label' }]}
          yAxis={[{ label: '吨 CO₂e' }]}
          series={[
            {
              id: 'emissions',
              label: '周度排放',
              dataKey: 'emissions',
              area: true,
              curve: 'monotoneX',
              color: theme.palette.success.main,
              showMark: false,
            },
          ]}
          slotProps={{
            legend: { position: { vertical: 'top', horizontal: 'left' } },
          }}
          margin={{ top: 32, right: 24, left: 56, bottom: 32 }}
        />
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          p: 2,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="subtitle2">审计要点</Typography>
        <Chip label="因子版本化 + 审批" variant="outlined" />
        <Chip label="核算链路留痕" variant="outlined" />
        <Chip label="报表签名可验证" variant="outlined" />
      </Paper>
    </Stack>
  )
}

export default CarbonPage
