import { NextResponse } from 'next/server'
import { readPublishedWorkflow } from '@/lib/published-workflow'
import { runWorkflow } from '@/lib/workflow-runtime'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const workflow = readPublishedWorkflow((await params).token)
    const input = await request.json().catch(() => ({})) as Record<string, unknown>
    const result = await runWorkflow({ workflowName: workflow.workflowName, nodes: workflow.nodes as Parameters<typeof runWorkflow>[0]['nodes'], input, live: workflow.live })
    return NextResponse.json(result, { headers: corsHeaders })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook failed.' }, { status: 400, headers: corsHeaders }) }
}
