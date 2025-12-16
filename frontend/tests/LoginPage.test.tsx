import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import LoginPage from '../src/features/auth/LoginPage'

const renderWithProviders = (ui: React.ReactElement) => {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  it('renders username and password fields', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByLabelText(/用户名/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument()
  })

  it('allows input change', () => {
    renderWithProviders(<LoginPage />)
    const userInput = screen.getByLabelText(/用户名/i)
    fireEvent.change(userInput, { target: { value: 'tester' } })
    expect(userInput).toHaveValue('tester')
  })
})
