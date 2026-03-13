/**
 * QuotaProgress Component Test
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuotaProgress } from '@/components/ai-keys/QuotaProgress'

describe('QuotaProgress', () => {
  it('renders unlimited message when daily is null', () => {
    render(<QuotaProgress used={100} daily={null} />)
    expect(screen.getByText('无限制')).toBeInTheDocument()
  })

  it('renders progress bar with valid daily quota', () => {
    render(<QuotaProgress used={50} daily={100} />)
    expect(screen.getByText('50 / 100')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('calculates percentage correctly', () => {
    const { container } = render(<QuotaProgress used={25} daily={100} showLabels={false} />)
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument()
  })

  it('shows warning color when near limit (>=80%)', () => {
    render(<QuotaProgress used={80} daily={100} />)
    const percentageText = screen.getByText('80%')
    expect(percentageText).toHaveClass('text-orange-600')
  })

  it('shows danger color when over limit (>=100%)', () => {
    render(<QuotaProgress used={120} daily={100} />)
    const percentageText = screen.getByText('100%')
    expect(percentageText).toHaveClass('text-red-600')
  })

  it('hides labels when showLabels is false', () => {
    render(<QuotaProgress used={50} daily={100} showLabels={false} />)
    expect(screen.queryByText('50 / 100')).not.toBeInTheDocument()
  })

  it('applies size classes correctly', () => {
    const { container: sm } = render(<QuotaProgress used={50} daily={100} size="sm" />)
    const { container: md } = render(<QuotaProgress used={50} daily={100} size="md" />)
    const { container: lg } = render(<QuotaProgress used={50} daily={100} size="lg" />)

    expect(sm.querySelector('.h-1')).toBeInTheDocument()
    expect(md.querySelector('.h-2')).toBeInTheDocument()
    expect(lg.querySelector('.h-3')).toBeInTheDocument()
  })
})
