'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Clock3, Trash2, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SavedWorkflow = {
  workflowName: string
  nodes: Array<{ id: number }>
  savedAt?: string
}

export default function DashboardWorkspace() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [loaded, setLoaded] = useState(false)

  const loadWorkflows = () => {
    setWorkflows(readSavedWorkflows())
    setLoaded(true)
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(loadWorkflows, 0)
    window.addEventListener('storage', loadWorkflows)
    return () => {
      window.clearTimeout(loadTimer)
      window.removeEventListener('storage', loadWorkflows)
    }
  }, [])

  const removeWorkflow = (workflow: SavedWorkflow) => {
    window.localStorage.removeItem(`fuzzie-workflow:${workflow.workflowName}`)
    loadWorkflows()
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Your workflows</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loaded ? `${workflows.length} saved locally in this browser` : 'Loading your saved workflows...'}
            </p>
          </div>
          {workflows.length > 0 && <Workflow className="size-5 text-violet-500" />}
        </div>
        {!loaded || workflows.length === 0 ? (
          <div className="mt-6 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed text-center">
            <Workflow className="size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No saved workflows yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Save your first automation in the editor to see it here.</p>
            <Button asChild variant="outline" className="mt-4 rounded-xl">
              <Link href="/workflows">Open workflow builder</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {workflows.map((workflow) => (
              <div key={`${workflow.workflowName}-${workflow.savedAt}`} className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <Link href={`/workflows?name=${encodeURIComponent(workflow.workflowName)}`} className="min-w-0 flex-1 hover:text-violet-500">
                  <p className="truncate font-medium">{workflow.workflowName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{workflow.nodes.length} node{workflow.nodes.length === 1 ? '' : 's'}</p>
                </Link>
                <button type="button" onClick={() => removeWorkflow(workflow)} aria-label={`Delete ${workflow.workflowName}`} className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {workflows.length === 0 ? (
          <div className="mt-6 flex min-h-40 flex-col items-center justify-center text-center">
            <Clock3 className="size-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No activity yet</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Save a workflow and your latest activity will appear here.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {workflows.slice(0, 4).map((workflow) => (
              <div key={`activity-${workflow.workflowName}-${workflow.savedAt}`} className="flex gap-3">
                <div className="mt-0.5 rounded-full bg-emerald-500/10 p-2 text-emerald-500"><Workflow className="size-4" /></div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{workflow.workflowName} saved</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatSavedAt(workflow.savedAt)}</p>
                </div>
              </div>
            ))}
            <Link href="/workflows" className="inline-flex items-center gap-1 text-sm font-medium text-violet-500 hover:underline">Open workflow builder <ArrowUpRight className="size-3.5" /></Link>
          </div>
        )}
      </div>
    </section>
  )
}

function readSavedWorkflows() {
  const saved: SavedWorkflow[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith('fuzzie-workflow:')) continue
    try {
      const workflow = JSON.parse(window.localStorage.getItem(key) || '') as SavedWorkflow
      if (workflow.workflowName) saved.push(workflow)
    } catch {
      // Ignore invalid local entries rather than breaking the dashboard.
    }
  }
  return saved.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))
}

function formatSavedAt(savedAt?: string) {
  if (!savedAt) return 'Saved locally'
  return `Saved ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(savedAt))}`
}
