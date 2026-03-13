/**
 * HealthStatus Component Test
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HealthStatusBadge, getHealthStatus } from '@/components/ai-proxies/HealthStatus'

describe('HealthStatusBadge', () => {
  it('renders healthy status', () => {
    render(<HealthStatusBadge status="healthy" showLabel />)
    expect(screen.getByText('健康')).toBeInTheDocument()
  })

  it('renders unhealthy status', () => {
    render(<HealthStatusBadge status="unhealthy" showLabel />)
    expect(screen.getByText('故障')).toBeInTheDocument()
  })

  it('renders unknown status', () => {
    render(<HealthStatusBadge status="unknown" showLabel />)
    expect(screen.getByText('未知')).toBeInTheDocument()
  })

  it('renders disabled status', () => {
    render(<HealthStatusBadge status="disabled" showLabel />)
    expect(screen.getByText('禁用')).toBeInTheDocument()
  })

  it('shows latency when healthy', () => {
    render(<HealthStatusBadge status="healthy" latency={50} />)
    expect(screen.getByText('50ms')).toBeInTheDocument()
  })

  it('hides latency when unhealthy', () => {
    render(<HealthStatusBadge status="unhealthy" latency={500} />)
    expect(screen.queryByText('500ms')).not.toBeInTheDocument()
  })

  it('applies size classes correctly', () => {
    const { container: sm } = render(<HealthStatusBadge status="healthy" size="sm" />)
    const { container: md } = render(<HealthStatusBadge status="healthy" size="md" />)
    const { container: lg } = render(<HealthStatusBadge status="healthy" size="lg" />)

    // Size classes are applied to badge children
    expect(sm.querySelector('[class*="text-xs"]')).toBeInTheDocument()
    expect(md.querySelector('[class*="text-sm"]')).toBeInTheDocument()
    expect(lg.querySelector('[class*="text-base"]')).toBeInTheDocument()
  })
})

describe('getHealthStatus', () => {
  it('returns disabled when not active', () => {
    expect(getHealthStatus(false, true, new Date().toISOString())).toBe('disabled')
    expect(getHealthStatus(false, false, new Date().toISOString())).toBe('disabled')
  })

  it('returns unknown when no check data', () => {
    expect(getHealthStatus(true, null, null)).toBe('unknown')
    expect(getHealthStatus(true, undefined, undefined)).toBe('unknown')
  })

  it('returns healthy when active and healthy', () => {
    expect(getHealthStatus(true, true, new Date().toISOString())).toBe('healthy')
  })

  it('returns unhealthy when active but not healthy', () => {
    expect(getHealthStatus(true, false, new Date().toISOString())).toBe('unhealthy')
  })
})
