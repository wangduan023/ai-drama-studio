/**
 * Health Check Cron Job
 * 定时健康检查任务
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHealthMonitor } from '@/lib/ai/health-monitor'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const monitor = createHealthMonitor({
      autoDisable: true,
      consecutiveFailuresThreshold: 3,
    })

    const startTime = Date.now()
    const result = await monitor.performFullCheck()
    const duration = Date.now() - startTime

    console.log('[Cron] Health check completed:', {
      duration: `${duration}ms`,
      summary: result.summary,
    })

    if (result.summary.unhealthy > 0) {
      await sendAlert(result)
    }

    return NextResponse.json({ success: true, duration, ...result })
  } catch (error: any) {
    console.error('[Cron] Health check failed:', error)
    return NextResponse.json(
      { error: 'Health check failed', message: error.message },
      { status: 500 }
    )
  }
}

async function sendAlert(result: { keys: any[]; proxies: any[]; summary: { unhealthy: number } }): Promise<void> {
  const unhealthyKeys = result.keys.filter(k => k.status === 'unhealthy')
  const unhealthyProxies = result.proxies.filter(p => p.status === 'unhealthy')

  const message = {
    text: 'AI Service Health Alert',
    details: {
      unhealthyKeys: unhealthyKeys.map(k => ({ id: k.id, name: k.name, error: k.error })),
      unhealthyProxies: unhealthyProxies.map(p => ({ id: p.id, name: p.name, error: p.error })),
    },
  }

  console.warn('[Alert]', message)

  const webhookUrl = process.env.ALERT_WEBHOOK_URL
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })
    } catch (error) {
      console.error('Failed to send alert:', error)
    }
  }
}
