import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

type PublishedWorkflow = { workflowName: string; nodes: unknown[]; live: boolean; expiresAt: number }

const secret = () => {
  const value = process.env.WORKFLOW_WEBHOOK_SECRET
  if (!value || value.length < 32) throw new Error('Set WORKFLOW_WEBHOOK_SECRET to a random value of at least 32 characters.')
  return value
}
const signature = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url')

export function publishWorkflow(workflow: Omit<PublishedWorkflow, 'expiresAt'>) {
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length > 50) throw new Error('Workflow definition is invalid.')
  const payload = Buffer.from(JSON.stringify({ ...workflow, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 365 })).toString('base64url')
  return `${payload}.${signature(payload)}`
}

export function readPublishedWorkflow(token: string): PublishedWorkflow {
  const [payload, supplied] = token.split('.')
  if (!payload || !supplied) throw new Error('Invalid workflow URL.')
  const expected = signature(payload)
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new Error('Invalid workflow URL signature.')
  const workflow = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as PublishedWorkflow
  if (!workflow.workflowName || !Array.isArray(workflow.nodes) || workflow.nodes.length > 50 || workflow.expiresAt < Date.now()) throw new Error('This workflow URL is invalid or expired.')
  return workflow
}
