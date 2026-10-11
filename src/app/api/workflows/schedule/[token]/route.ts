import { NextResponse } from 'next/server'
import { readPublishedWorkflow } from '@/lib/published-workflow'
import { runWorkflow } from '@/lib/workflow-runtime'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const expectedKey = process.env.CRON_JOB_KEY
    if (!expectedKey || request.headers.get('authorization') !== `Bearer ${expectedKey}`) return NextResponse.json({ error: 'Unauthorized schedule request.' }, { status: 401 })
    const workflow = readPublishedWorkflow((await params).token)
    const input = await request.json().catch(() => ({})) as Record<string, unknown>
    const result = await runWorkflow({ workflowName: workflow.workflowName, nodes: workflow.nodes as Parameters<typeof runWorkflow>[0]['nodes'], input, live: workflow.live })
    return NextResponse.json(result)
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Scheduled run failed.' }, { status: 400 }) }
}
