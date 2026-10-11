import { NextResponse } from 'next/server'
import { publishWorkflow } from '@/lib/published-workflow'
import { registerLocalSchedule } from '@/lib/local-workflow-scheduler'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { workflowName?: string; nodes?: unknown[]; live?: boolean }
    if (!body.workflowName || !Array.isArray(body.nodes)) return NextResponse.json({ error: 'workflowName and nodes are required.' }, { status: 400 })
    const token = publishWorkflow({ workflowName: body.workflowName, nodes: body.nodes, live: body.live === true })
    const localSchedulerActive = registerLocalSchedule(body.workflowName, body.nodes as Parameters<typeof registerLocalSchedule>[1])
    const origin = new URL(request.url).origin
    return NextResponse.json({ webhookUrl: `${origin}/api/workflows/webhook/${token}`, scheduleUrl: `${origin}/api/workflows/schedule/${token}`, localSchedulerActive })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to publish workflow.' }, { status: 400 }) }
}
