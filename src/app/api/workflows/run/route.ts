import { NextResponse } from 'next/server'
import { runWorkflow } from '@/lib/workflow-runtime'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { workflowName?: string; nodes?: unknown; input?: Record<string, unknown>; live?: boolean }
    if (!body.workflowName || !Array.isArray(body.nodes)) return NextResponse.json({ error: 'workflowName and nodes are required.' }, { status: 400 })
    const result = await runWorkflow({ workflowName: body.workflowName, nodes: body.nodes as Parameters<typeof runWorkflow>[0]['nodes'], input: body.input, live: body.live === true })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Workflow execution failed.' }, { status: 400 })
  }
}
