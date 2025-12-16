import { CssBaseline, ThemeProvider } from '@mui/material'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { theme } from '../src/app/theme'
import StatusCard from '../src/components/StatusCard'

describe('StatusCard', () => {
  it('renders title and value', () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StatusCard title="实时功率" value="128" status="normal" helper="测试" />
      </ThemeProvider>,
    )

    expect(screen.getByText('实时功率')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('测试')).toBeInTheDocument()
  })
})
