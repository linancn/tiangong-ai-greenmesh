import { createContext } from 'react'
import { createTheme, type PaletteMode } from '@mui/material/styles'

type Scheme = {
  primary: string
  on_primary: string
  primary_container: string
  on_primary_container: string
  secondary: string
  on_secondary: string
  secondary_container: string
  on_secondary_container: string
  tertiary: string
  on_tertiary: string
  tertiary_container: string
  on_tertiary_container: string
  error: string
  on_error: string
  error_container: string
  on_error_container: string
  background: string
  surface: string
  on_surface: string
  surface_variant: string
  on_surface_variant: string
  outline: string
  outline_variant: string
  inverse_surface: string
  inverse_on_surface: string
  inverse_primary: string
  surface_container_high: string
  surface_container: string
  surface_container_low: string
}

// Palette synced with material-theme.json (Material Theme Builder export 2025-12-16)
const materialSchemes: Record<PaletteMode, Scheme> = {
  light: {
    primary: '#0062E7',
    on_primary: '#FFFFFF',
    primary_container: '#DAE2FF',
    on_primary_container: '#2F4578',
    secondary: '#585E71',
    on_secondary: '#FFFFFF',
    secondary_container: '#DCE2F9',
    on_secondary_container: '#404659',
    tertiary: '#725572',
    on_tertiary: '#FFFFFF',
    tertiary_container: '#FDD7FA',
    on_tertiary_container: '#593D59',
    error: '#BA1A1A',
    on_error: '#FFFFFF',
    error_container: '#FFDAD6',
    on_error_container: '#93000A',
    background: '#FAF8FF',
    surface: '#FAF8FF',
    on_surface: '#1A1B21',
    surface_variant: '#E1E2EC',
    on_surface_variant: '#44464F',
    outline: '#757780',
    outline_variant: '#C5C6D0',
    inverse_surface: '#2F3036',
    inverse_on_surface: '#F1F0F7',
    inverse_primary: '#B1C5FF',
    surface_container_high: '#E8E7EF',
    surface_container: '#EEEDF4',
    surface_container_low: '#F4F3FA',
  },
  dark: {
    primary: '#B1C5FF',
    on_primary: '#162E60',
    primary_container: '#2F4578',
    on_primary_container: '#DAE2FF',
    secondary: '#C0C6DC',
    on_secondary: '#2A3042',
    secondary_container: '#404659',
    on_secondary_container: '#DCE2F9',
    tertiary: '#E0BBDD',
    on_tertiary: '#412742',
    tertiary_container: '#593D59',
    on_tertiary_container: '#FDD7FA',
    error: '#FFB4AB',
    on_error: '#690005',
    error_container: '#93000A',
    on_error_container: '#FFDAD6',
    background: '#121318',
    surface: '#121318',
    on_surface: '#E2E2E9',
    surface_variant: '#44464F',
    on_surface_variant: '#C5C6D0',
    outline: '#8F9099',
    outline_variant: '#44464F',
    inverse_surface: '#E2E2E9',
    inverse_on_surface: '#2F3036',
    inverse_primary: '#b1c5ff',
    surface_container_high: '#282A2F',
    surface_container: '#1E1F25',
    surface_container_low: '#1A1B21',
  },
}

export const ColorModeContext = createContext<{
  mode: PaletteMode
  toggleMode: () => void
}>({
  mode: 'light',
  toggleMode: () => {},
})

export const createAppTheme = (mode: PaletteMode) => {
  const palette = materialSchemes[mode]

  return createTheme({
    palette: {
      mode,
      primary: {
        main: palette.primary,
        contrastText: palette.on_primary,
      },
      secondary: {
        main: palette.secondary,
        contrastText: palette.on_secondary,
      },
      error: {
        main: palette.error,
        light: palette.error_container,
        contrastText: palette.on_error,
      },
      background: {
        default: palette.on_primary,
        paper: palette.surface_container_low,
      },
      text: {
        primary: palette.on_surface,
        secondary: palette.on_surface_variant,
      },
      divider: palette.outline_variant,
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Inter","Segoe UI","Noto Sans","Helvetica Neue",Arial,sans-serif',
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.background,
            color: palette.on_surface,
            colorScheme: mode,
          },
        },
      },
    },
  })
}
