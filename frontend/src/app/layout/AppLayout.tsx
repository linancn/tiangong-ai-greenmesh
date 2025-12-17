import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import {
  AppBar,
  Box,
  Chip,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useContext } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ColorModeContext } from '../theme'

const navItems = [
  { label: '态势总览', path: '/' },
  { label: '调度编排', path: '/dispatch' },
  { label: '碳核算', path: '/carbon' },
  { label: '审计追溯', path: '/audit' },
]

const resolveActivePath = (pathname: string) => {
  if (pathname === '/') {
    return '/'
  }

  const match = navItems.find((item) => pathname.startsWith(item.path))
  return match?.path ?? '/'
}

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const activePath = resolveActivePath(location.pathname)
  const theme = useTheme()
  const { toggleMode } = useContext(ColorModeContext)
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 2, minHeight: 72 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 200 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                letterSpacing: -0.5,
              }}
            >
              GM
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ letterSpacing: 0.3 }}>
                GreenMesh
              </Typography>
              <Typography variant="caption" color="text.secondary">
                零碳园区 · 源-网-荷-储-充
              </Typography>
            </Box>
          </Stack>
          <Tabs
            value={activePath}
            onChange={(_, value) => navigate(value)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ ml: 2, minHeight: 64, flex: 1 }}
          >
            {navItems.map((item) => (
              <Tab
                key={item.path}
                label={item.label}
                value={item.path}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              />
            ))}
          </Tabs>
          <Stack direction="row" spacing={1}>
            <Chip label="规则兜底" color="success" variant="outlined" size="small" />
            <Chip label="可追溯" color="primary" variant="outlined" size="small" />
            <Chip label="DM8" icon={<StorageOutlinedIcon />} size="small" />
            <Tooltip title={isDark ? '切换到明亮模式' : '切换到深色模式'}>
              <Box>
                <Chip
                  icon={isDark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
                  label={isDark ? 'Light' : 'Dark'}
                  variant="outlined"
                  onClick={toggleMode}
                  clickable
                  size="small"
                />
              </Box>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ py: 3 }}>
        <Container maxWidth="xl">
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <BoltRoundedIcon color="primary" />
                <Typography variant="h5">实时态势 + 可控调度</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                秒级采集，规则优先，调度可回退；碳口径一致且可复盘。
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip label="源-网-荷-储-充覆盖" size="small" variant="outlined" />
                <Chip label="多园区/多站点" size="small" variant="outlined" />
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Chip label="在线园区 3" color="primary" variant="filled" />
              <Chip label="设备正常 98.4%" color="success" variant="outlined" />
              <Chip
                icon={<ShieldOutlinedIcon />}
                label="策略版本 v2025.01"
                variant="outlined"
              />
            </Stack>
          </Paper>

          <Outlet />
        </Container>
      </Box>
    </Box>
  )
}

export default AppLayout
