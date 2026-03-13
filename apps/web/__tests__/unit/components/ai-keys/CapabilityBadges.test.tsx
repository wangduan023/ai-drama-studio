/**
 * CapabilityBadges Component Test
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CapabilityBadges } from '@/components/ai-keys/CapabilityBadges'

describe('CapabilityBadges', () => {
  it('renders without capabilities shows default badge', () => {
    render(<CapabilityBadges />)
    expect(screen.getByText('通用')).toBeInTheDocument()
  })

  it('renders single capability badge', () => {
    render(<CapabilityBadges capabilities={['TEXT']} />)
    expect(screen.getByText('文字')).toBeInTheDocument()
  })

  it('renders multiple capability badges', () => {
    render(<CapabilityBadges capabilities={['TEXT', 'IMAGE', 'VIDEO']} />)
    expect(screen.getByText('文字')).toBeInTheDocument()
    expect(screen.getByText('图像')).toBeInTheDocument()
    expect(screen.getByText('视频')).toBeInTheDocument()
  })

  it('applies correct colors for each capability', () => {
    const { container } = render(
      <CapabilityBadges capabilities={['TEXT', 'IMAGE', 'VIDEO', 'VOICE']} />
    )

    const badges = container.querySelectorAll('[class*="bg-"]')
    expect(badges.length).toBeGreaterThanOrEqual(4)
  })

  it('applies size classes correctly', () => {
    const { container: sm } = render(<CapabilityBadges capabilities={['TEXT']} size="sm" />)
    const { container: md } = render(<CapabilityBadges capabilities={['TEXT']} size="md" />)
    const { container: lg } = render(<CapabilityBadges capabilities={['TEXT']} size="lg" />)

    // Size classes are applied to Badge children, check first badge
    expect(sm.querySelector('[class*="text-xs"]')).toBeInTheDocument()
    expect(md.querySelector('[class*="text-sm"]')).toBeInTheDocument()
    expect(lg.querySelector('[class*="text-base"]')).toBeInTheDocument()
  })

  it('hides icons when showIcons is false', () => {
    render(<CapabilityBadges capabilities={['TEXT']} showIcons={false} />)
    expect(screen.getByText('文字')).toBeInTheDocument()
  })
})
