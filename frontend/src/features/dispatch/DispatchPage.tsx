import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import LanRoundedIcon from '@mui/icons-material/LanRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import {
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { useTheme } from '@mui/material/styles'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  fetchDispatchPlan,
  fetchDispatchPlans,
  fetchParks,
  type DispatchPlan,
  type DispatchPlanDetail,
  type DispatchPlanWithDetails,
  type Park,
} from '../../api/client'

const statusOptions = ['', 'DRAFT', 'PENDING', 'RUNNING', 'DONE']

const statusChipColor = (status?: string) => {
  const normalized = status?.toLowerCase() ?? ''
  if (['running', 'executing', 'active'].includes(normalized)) return 'primary'
  if (['done', 'closed', 'completed'].includes(normalized)) return 'success'
  if (['pending', 'draft'].includes(normalized)) return 'warning'
  return 'default'
}

const formatTs = (ts?: string) => (ts ? dayjs(ts).format('MM-DD HH:mm') : '--')

const numberLabel = (value?: number | null, digits = 2) => {
  if (value === undefined || value === null) return '--'
  return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: digits })
}

function DispatchPage() {
  const theme = useTheme()
  const [parkIdSelection, setParkIdSelection] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState('')
  const [planIdSelection, setPlanIdSelection] = useState<number | undefined>()

  const { data: parks = [] } = useQuery<Park[]>({
    queryKey: ['parks'],
    queryFn: fetchParks,
  })

  const activeParkId = useMemo(
    () => parkIdSelection ?? parks[0]?.id,
    [parkIdSelection, parks],
  )

  const { data: plans = [] } = useQuery<DispatchPlan[]>({
    queryKey: ['dispatch', 'plans', activeParkId, statusFilter],
    queryFn: () =>
      fetchDispatchPlans({
        parkId: activeParkId,
        status: statusFilter || undefined,
      }),
  })

  const activePlanId = useMemo(() => {
    if (planIdSelection && plans.some((plan) => plan.id === planIdSelection)) {
      return planIdSelection
    }
    return plans[0]?.id
  }, [planIdSelection, plans])

  const { data: planDetails } = useQuery<DispatchPlanWithDetails>({
    queryKey: ['dispatch', 'plan', activePlanId],
    queryFn: () => fetchDispatchPlan(activePlanId!),
    enabled: Boolean(activePlanId),
  })

  const selectedPlan = useMemo(() => {
    if (planDetails?.plan) return planDetails.plan
    return plans.find((plan) => plan.id === activePlanId)
  }, [planDetails, plans, activePlanId])

  const planDetailRows: DispatchPlanDetail[] = planDetails?.details ?? []
  const parkLookup = useMemo(
    () => Object.fromEntries(parks.map((park) => [park.id, park.name])),
    [parks],
  )

  return (
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 1.5, md: 2 } }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          useFlexGap
          flexWrap="wrap"
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="dispatch-park-label">园区</InputLabel>
            <Select
              labelId="dispatch-park-label"
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
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="dispatch-status-label">计划状态</InputLabel>
            <Select
              labelId="dispatch-status-label"
              label="计划状态"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusOptions.map((opt) => (
                <MenuItem key={opt || 'all'} value={opt}>
                  {opt ? opt : '全部'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip
            size="small"
            variant="outlined"
            color="primary"
            label={`匹配到 ${plans.length} 个计划`}
          />
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 2, md: 3 }, height: '100%' }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <PlayArrowRoundedIcon color="primary" />
              <Typography variant="h6">调度计划列表</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              通过 `/api/dispatch/plans` 读取，按创建时间倒序。点击行可查看明细（计划 {activePlanId ?? '--'}）。
            </Typography>
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>园区</TableCell>
                    <TableCell>时段</TableCell>
                    <TableCell align="right">间隔(min)</TableCell>
                    <TableCell align="right">策略档案</TableCell>
                    <TableCell align="right">状态</TableCell>
                    <TableCell align="right">创建时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow
                      key={plan.id}
                      hover
                      selected={plan.id === activePlanId}
                      onClick={() => setPlanIdSelection(plan.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{plan.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{parkLookup[plan.parkId] ?? `#${plan.parkId}`}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="body2">{formatTs(plan.horizonStart)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            → {formatTs(plan.horizonEnd)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{plan.intervalMin ?? '--'}</TableCell>
                      <TableCell align="right">{plan.strategyProfileId ?? '--'}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" color={statusChipColor(plan.status)} label={plan.status || '未知'} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{formatTs(plan.createdTs)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!plans.length && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography variant="body2" color="text.secondary">
                          暂无计划，请先通过 API 创建占位计划。
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 2, md: 3 }, height: '100%' }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <LanRoundedIcon color="primary" />
              <Typography variant="subtitle1">计划概览</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={1}>
              详情来自 /api/dispatch/plans/{'{'}id{'}'}，包含计划头与明细。
            </Typography>
            <Divider sx={{ my: 1 }} />
            {selectedPlan ? (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip size="small" color={statusChipColor(selectedPlan.status)} label={selectedPlan.status || '未知'} />
                  <Chip size="small" variant="outlined" label={`计划 ${selectedPlan.id}`} />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={parkLookup[selectedPlan.parkId] ? `园区 ${parkLookup[selectedPlan.parkId]}` : `园区 #${selectedPlan.parkId}`}
                  />
                </Stack>
                <Typography variant="body2">
                  预测时段：{formatTs(selectedPlan.horizonStart)} → {formatTs(selectedPlan.horizonEnd)}
                </Typography>
                <Typography variant="body2">
                  间隔：{selectedPlan.intervalMin ?? '--'} 分钟 · 策略档案：{selectedPlan.strategyProfileId ?? '未指定'}
                </Typography>
                <Typography variant="body2">创建：{formatTs(selectedPlan.createdTs)}</Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  color="primary"
                  label={`明细 ${planDetailRows.length} 条`}
                  sx={{ alignSelf: 'flex-start' }}
                />
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                选择左侧表格中的计划查看摘要。
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 2, md: 3 } }}
      >
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <SecurityRoundedIcon color="primary" />
          <Typography variant="h6">计划明细</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2}>
          明细基于 `DISPATCH_PLAN_DETAIL`，可用于演示调度回放；若为空请先通过 POST `/api/dispatch/plans` 填充。
        </Typography>
        <TableContainer sx={{ maxHeight: 460 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>时间</TableCell>
                <TableCell>资产 ID</TableCell>
                <TableCell align="right">P 设定 (kW)</TableCell>
                <TableCell align="right">Q 设定 (kvar)</TableCell>
                <TableCell align="right">热 (MW)</TableCell>
                <TableCell align="right">SOC 目标</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {planDetailRows.map((detail) => (
                <TableRow key={`${detail.planId}-${detail.id}`}>
                  <TableCell>{formatTs(detail.ts)}</TableCell>
                  <TableCell>{detail.assetId}</TableCell>
                  <TableCell align="right">{numberLabel(detail.pSetKw, 2)}</TableCell>
                  <TableCell align="right">{numberLabel(detail.qSetKvar, 2)}</TableCell>
                  <TableCell align="right">{numberLabel(detail.heatSetMw, 2)}</TableCell>
                  <TableCell align="right">{numberLabel(detail.socTarget, 2)}</TableCell>
                </TableRow>
              ))}
              {!planDetailRows.length && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      未选择计划或计划暂无明细。
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 2, md: 3 },
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <BoltRoundedIcon color="primary" />
        <Typography variant="subtitle2">安全兜底</Typography>
        <Chip label={`当前计划 ${activePlanId ?? '--'}`} variant="outlined" />
        <Chip label={`明细 ${planDetailRows.length} 条`} variant="outlined" />
        <Chip label={`园区 ${parkLookup[activeParkId ?? 0] ?? '全部'}`} variant="outlined" />
        <Chip
          label="计划 / 明细均落库，可回放"
          variant="outlined"
          sx={{ bgcolor: theme.palette.action.hover }}
        />
      </Paper>
    </Stack>
  )
}

export default DispatchPage
