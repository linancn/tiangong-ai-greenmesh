import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded'
import LanRoundedIcon from '@mui/icons-material/LanRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import {
  Chip,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { useTheme } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { LineChart } from '@mui/x-charts/LineChart'
import StatusCard from '../../components/StatusCard'
import {
  fetchAssets,
  fetchDispatchPlans,
  fetchGenerationForecast,
  fetchLatestMeasurements,
  fetchMeterPoints,
  fetchParks,
  type Asset,
  type DispatchPlan,
  type GenForecastPoint,
  type Measurement,
  type MeterPoint,
  type Park,
} from '../../api/client'
import type { StatusLevel } from '../../types/common'

type OverviewMetric = {
  id: string
  title: string
  value: string
  helper?: string
  trend?: number
  status?: StatusLevel
}

const formatTs = (ts?: string) => (ts ? dayjs(ts).format('MM-DD HH:mm') : '--')

const formatNumber = (value?: number | null, digits = 2) => {
  if (value === undefined || value === null) return '--'
  return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: digits })
}

const calcTrend = (values: Array<number | null | undefined>) => {
  const filtered = values.filter((v): v is number => typeof v === 'number')
  if (filtered.length < 2) return undefined
  const first = filtered[0]
  const last = filtered[filtered.length - 1]
  if (!first) return undefined
  const delta = ((last - first) / Math.abs(first)) * 100
  if (!Number.isFinite(delta)) return undefined
  return Math.round(delta * 10) / 10
}

const planStatusColor = (status?: string) => {
  const normalized = status?.toLowerCase() ?? ''
  if (['running', 'executing', 'active'].includes(normalized)) return 'primary'
  if (['approved', 'confirmed', 'ready'].includes(normalized)) return 'success'
  if (['draft', 'pending'].includes(normalized)) return 'warning'
  if (['error', 'failed'].includes(normalized)) return 'error'
  return 'default'
}

function OverviewPage() {
  const theme = useTheme()
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'))
  const [parkIdSelection, setParkIdSelection] = useState<number | undefined>()
  const [assetIdSelection, setAssetIdSelection] = useState<number | undefined>()
  const [manualPointIds, setManualPointIds] = useState('')

  const { data: parks = [] } = useQuery<Park[]>({
    queryKey: ['parks'],
    queryFn: fetchParks,
  })

  const activeParkId = useMemo(
    () => parkIdSelection ?? parks[0]?.id,
    [parkIdSelection, parks],
  )

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets', activeParkId],
    queryFn: () => fetchAssets(activeParkId ? { parkId: activeParkId } : undefined),
  })

  const { data: meterPoints = [] } = useQuery<MeterPoint[]>({
    queryKey: ['meter-points', activeParkId],
    queryFn: () => fetchMeterPoints(activeParkId ? { parkId: activeParkId } : undefined),
    enabled: Boolean(activeParkId),
  })

  const activeAssetId = useMemo(() => {
    if (assetIdSelection && assets.some((item) => item.id === assetIdSelection)) {
      return assetIdSelection
    }
    return assets[0]?.id
  }, [assetIdSelection, assets])

  const parsedManualPointIds = useMemo(
    () => manualPointIds.split(',').map((id) => id.trim()).filter(Boolean),
    [manualPointIds],
  )
  const fallbackPointIds = useMemo(() => {
    if (!meterPoints.length) return []
    const scoped = activeAssetId
      ? meterPoints.filter((mp) => mp.assetId === activeAssetId)
      : meterPoints
    const targets = scoped.length ? scoped : meterPoints
    return targets.slice(0, 3).map((mp) => mp.id.toString())
  }, [meterPoints, activeAssetId])
  const pointIds = parsedManualPointIds.length ? parsedManualPointIds : fallbackPointIds

  const { data: measurements = [] } = useQuery<Measurement[]>({
    queryKey: ['timeseries', 'latest', pointIds.join(',')],
    queryFn: () => fetchLatestMeasurements(pointIds),
    enabled: pointIds.length > 0,
  })

  const forecastRange = useMemo(() => {
    const now = dayjs()
    return {
      start: now.subtract(3, 'hour').toISOString(),
      end: now.add(12, 'hour').toISOString(),
    }
  }, [])

  const { data: forecast = [] } = useQuery<GenForecastPoint[]>({
    queryKey: ['forecast-gen', activeAssetId, forecastRange.start, forecastRange.end],
    queryFn: () =>
      fetchGenerationForecast({
        assetId: activeAssetId!,
        start: forecastRange.start,
        end: forecastRange.end,
      }),
    enabled: Boolean(activeAssetId),
  })

  const { data: plans = [] } = useQuery<DispatchPlan[]>({
    queryKey: ['dispatch-plans', activeParkId],
    queryFn: () => fetchDispatchPlans(activeParkId ? { parkId: activeParkId } : undefined),
  })

  const selectedPark = parks.find((p) => p.id === activeParkId)
  const selectedAsset = assets.find((a) => a.id === activeAssetId)
  const assetTypes = useMemo(
    () => Array.from(new Set(assets.map((a) => a.assetType))).slice(0, 3).join(' / '),
    [assets],
  )
  const forecastValues = forecast.map((f) => f.pKwPred).filter((v): v is number => typeof v === 'number')
  const latestForecastValue = forecastValues.at(-1)
  const metrics: OverviewMetric[] = [
    {
      id: 'park',
      title: '园区',
      value: selectedPark?.name ?? '未选择',
      helper: selectedPark
        ? `${selectedPark.region ?? '未配置区域'} · ${selectedPark.timezone ?? '未配置时区'}`
        : '请选择园区以拉取资产/调度计划',
      status: selectedPark ? 'normal' : 'warning',
    },
    {
      id: 'assets',
      title: '资产数量',
      value: `${assets.length}`,
      helper: assets.length ? `类型：${assetTypes || '未标注'}` : '未找到资产，检查基础主数据',
      status: assets.length ? 'normal' : 'warning',
    },
    {
      id: 'latest',
      title: '最新测点值',
      value: measurements[0]?.value !== undefined && measurements[0]?.value !== null ? formatNumber(measurements[0].value) : '--',
      helper: measurements[0]
        ? `点位 ${measurements[0].pointId} · ${formatTs(measurements[0].ts)}`
        : pointIds.length
          ? '未返回数据，确认点位是否有值'
          : '填入监测点 ID 以请求最新值',
      status: measurements.length ? 'normal' : 'warning',
    },
    {
      id: 'forecast',
      title: '源侧预测 (kW)',
      value: latestForecastValue !== undefined ? formatNumber(latestForecastValue, 1) : '--',
      helper: selectedAsset ? `资产：${selectedAsset.name}` : '请选择资产获取预测',
      trend: calcTrend(forecastValues),
      status: forecast.length ? 'normal' : 'warning',
    },
  ]

  const forecastDataset = useMemo(
    () =>
      forecast.map((item) => ({
        label: dayjs(item.ts).format(isSmDown ? 'HH:mm' : 'MM-DD HH:mm'),
        pKwPred: item.pKwPred,
        p10: item.p10,
        p90: item.p90,
      })),
    [forecast, isSmDown],
  )

  return (
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 1.5, md: 2 },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          useFlexGap
          flexWrap="wrap"
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="park-select-label">园区</InputLabel>
            <Select
              labelId="park-select-label"
              label="园区"
              value={activeParkId ?? ''}
              onChange={(event) => setParkIdSelection(Number(event.target.value))}
            >
              {parks.map((park) => (
                <MenuItem key={park.id} value={park.id}>
                  {park.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }} disabled={!assets.length}>
            <InputLabel id="asset-select-label">预测资产</InputLabel>
            <Select
              labelId="asset-select-label"
              label="预测资产"
              value={activeAssetId ?? ''}
              onChange={(event) => setAssetIdSelection(Number(event.target.value))}
            >
              {assets.map((asset) => (
                <MenuItem key={asset.id} value={asset.id}>
                  {asset.name} · {asset.assetType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="监测点 ID（逗号分隔）"
            value={manualPointIds}
            onChange={(event) => setManualPointIds(event.target.value)}
            placeholder="自动用前 3 个资产 ID"
            helperText="用实际测点 ID 覆盖默认值"
            sx={{ minWidth: 240 }}
          />
        </Stack>
      </Paper>

      <Grid container spacing={2} alignItems="stretch">
        {metrics.map((metric) => (
          <Grid key={metric.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatusCard
              title={metric.title}
              value={metric.value}
              helper={metric.helper}
              trend={metric.trend}
              status={metric.status}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 2, md: 3 }, height: '100%' }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <TimelineRoundedIcon color="primary" />
              <Typography variant="h6">源侧预测曲线</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2.5}>
              读取 `/api/forecast/gen`，展示所选资产的预测曲线与区间；区间默认向前 3 小时、向后 12
              小时，便于回放与演示。
            </Typography>
            <LineChart
              height={340}
              dataset={forecastDataset}
              xAxis={[{ scaleType: 'point', dataKey: 'label' }]}
              yAxis={[{ id: 'power', label: 'kW' }]}
              series={[
                {
                  id: 'pred',
                  label: '预测功率',
                  dataKey: 'pKwPred',
                  yAxisId: 'power',
                  color: theme.palette.primary.main,
                  curve: 'monotoneX',
                  showMark: false,
                },
                {
                  id: 'p10',
                  label: 'P10',
                  dataKey: 'p10',
                  yAxisId: 'power',
                  color: theme.palette.warning.main,
                  curve: 'monotoneX',
                  showMark: false,
                },
                {
                  id: 'p90',
                  label: 'P90',
                  dataKey: 'p90',
                  yAxisId: 'power',
                  color: theme.palette.success.main,
                  curve: 'monotoneX',
                  showMark: false,
                },
              ]}
              slotProps={{
                legend: { direction: 'horizontal', position: { vertical: 'top', horizontal: 'start' } },
              }}
              margin={{ top: 32, right: isSmDown ? 48 : 72, left: 56, bottom: 32 }}
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 2, md: 3 }, height: '100%' }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <LanRoundedIcon color="primary" />
              <Typography variant="h6">调度计划</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              读取 `/api/dispatch/plans`，默认按创建时间倒序；可按园区筛选，便于排查和回放。
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <List dense>
              {plans.map((plan, index) => (
                <Stack key={plan.id}>
                  <ListItem sx={{ px: 0, py: 0.75, alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" color={planStatusColor(plan.status)} label={plan.status || '未知'} />
                          <Typography variant="subtitle2">计划 {plan.id}</Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatTs(plan.horizonStart)} → {formatTs(plan.horizonEnd)} · Δ{plan.intervalMin ?? '--'}min
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < plans.length - 1 && <Divider />}
                </Stack>
              ))}
              {!plans.length && (
                <Typography variant="body2" color="text.secondary">
                  暂无计划记录。
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 2, md: 3 } }}
      >
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <SensorsRoundedIcon color="primary" />
          <Typography variant="h6">最新测点值</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2}>
          通过 `/api/timeseries/latest` 取回指定测点的最新清洗值；默认使用前 3 个资产 ID，可用上方输入框覆盖。
        </Typography>
        <Grid container spacing={1.5}>
          {measurements.map((item) => (
            <Grid key={`${item.pointId}-${item.ts}`} size={{ xs: 12, md: 4 }}>
              <Paper
                variant="outlined"
                sx={{ p: 1.5, borderColor: 'divider', height: '100%' }}
              >
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" variant="outlined" label={`Point ${item.pointId}`} />
                    <Chip
                      size="small"
                      color={item.qualityFlag ? 'success' : 'default'}
                      label={item.qualityFlag || '未标记'}
                      icon={<PlayArrowRoundedIcon />}
                    />
                  </Stack>
                  <Typography variant="h5">{formatNumber(item.value)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTs(item.ts)} · 聚合 {item.aggLevel || 'raw'}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
          {!measurements.length && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                尚未返回最新测点值，请确认测点 ID 是否存在并有数据。
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <FlashOnRoundedIcon color="primary" />
          <Typography variant="subtitle1">实时态势要点</Typography>
        </Stack>
        <Chip label={`园区 ${selectedPark?.name ?? '未选择'}`} variant="outlined" />
        <Chip label={`资产 ${assets.length} 个`} variant="outlined" />
        <Chip label={`调度计划 ${plans.length} 条`} variant="outlined" />
        <Chip label={`测点 ${pointIds.length} 个`} variant="outlined" />
      </Paper>
    </Stack>
  )
}

export default OverviewPage
