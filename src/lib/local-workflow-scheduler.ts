import 'server-only'

import { runWorkflow } from '@/lib/workflow-runtime'

type Node = Parameters<typeof runWorkflow>[0]['nodes'][number]
type ScheduledWorkflow = { workflowName: string; nodes: Node[]; schedule: string; timezone: string; lastRunMinute?: string }

declare global {
  // eslint-disable-next-line no-var
  var localWorkflowSchedules: Map<string, ScheduledWorkflow> | undefined
  // eslint-disable-next-line no-var
  var localWorkflowScheduleTimer: ReturnType<typeof setInterval> | undefined
}

const schedules = globalThis.localWorkflowSchedules ?? new Map<string, ScheduledWorkflow>()
globalThis.localWorkflowSchedules = schedules

function clock(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return { minute: read('minute'), hour: read('hour'), key: `${read('year')}-${read('month')}-${read('day')} ${read('hour')}:${read('minute')}` }
}

function matchesPart(value: number, expression: string, max: number) {
  if (expression === '*') return true
  if (/^\*\/\d+$/.test(expression)) return value % Number(expression.slice(2)) === 0
  return expression.split(',').some((part) => Number(part) === value && value <= max)
}

function isDue(schedule: string, time: ReturnType<typeof clock>) {
  const [minute = '', hour = '', day = '*', month = '*', weekday = '*', ...extra] = schedule.trim().split(/\s+/)
  if (extra.length || !minute || !hour || day !== '*' || month !== '*' || weekday !== '*') return false
  return matchesPart(time.minute, minute, 59) && matchesPart(time.hour, hour, 23)
}

async function tick() {
  for (const [key, item] of schedules) {
    try {
      const time = clock(item.timezone)
      if (!isDue(item.schedule, time) || item.lastRunMinute === time.key) continue
      item.lastRunMinute = time.key
      await runWorkflow({ workflowName: item.workflowName, nodes: item.nodes, live: true })
      console.info(`[scheduler] Completed ${item.workflowName} at ${time.key} (${item.timezone})`)
    } catch (error) { console.error(`[scheduler] Failed ${key}`, error) }
  }
}

export function registerLocalSchedule(workflowName: string, nodes: Node[]) {
  const trigger = nodes.find((node) => node.enabled && node.title === 'On a schedule')
  if (!trigger) return false
  const schedule = trigger.config.schedule?.trim()
  const timezone = trigger.config.timezone?.trim() || 'UTC'
  if (!schedule) throw new Error('Enter a cron expression before publishing the schedule.')
  // Validate early so the user sees a publish error rather than a silent non-run.
  clock(timezone)
  if (!isDue(schedule, { minute: 0, hour: 0, key: '' }) && !/^(\*|\*\/\d+|\d+(,\d+)*)\s+(\*|\*\/\d+|\d+(,\d+)*)\s+\*\s+\*\s+\*$/.test(schedule)) throw new Error('Use a five-part minute/hour cron such as "36 1 * * *" or "*/5 * * * *".')
  schedules.set(workflowName, { workflowName, nodes, schedule, timezone })
  if (!globalThis.localWorkflowScheduleTimer) globalThis.localWorkflowScheduleTimer = setInterval(() => { void tick() }, 15_000)
  void tick()
  return true
}
