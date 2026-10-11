'use client'

import { useState } from 'react'
import { ArrowDown, Check, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const tasks = [
  { id: 'inbox', label: 'Inbox chaos', emoji: '📨', answer: 'automated' },
  { id: 'report', label: 'Weekly report', emoji: '📊', answer: 'automated' },
  { id: 'coffee', label: 'Coffee break', emoji: '☕', answer: 'human' },
  { id: 'calendar', label: 'Calendar Tetris', emoji: '🗓️', answer: 'automated' },
  { id: 'pet', label: 'Pet appreciation', emoji: '🐶', answer: 'human' },
]

export default function WorkflowPlayground() {
  const [automated, setAutomated] = useState<string[]>([])
  const [human, setHuman] = useState<string[]>([])
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState('Choose a task. Trust your automation instincts.')

  const placeTask = (destination: 'automated' | 'human') => {
    if (!draggedTask) return

    const task = tasks.find((item) => item.id === draggedTask)
    if (!task || isPlaced(task.id)) return

    setAutomated((current) => current.filter((task) => task !== draggedTask))
    setHuman((current) => current.filter((task) => task !== draggedTask))
    if (destination === 'automated') {
      setAutomated((current) => [...current, draggedTask])
    } else {
      setHuman((current) => [...current, draggedTask])
    }
    if (task.answer === destination) {
      setScore((current) => current + 100 + streak * 25)
      setStreak((current) => current + 1)
      setFeedback(`${task.label} sorted perfectly. Your future self approves.`)
    } else {
      setStreak(0)
      setFeedback(`${task.label} is allowed to be human. No automation crimes committed.`)
    }
    setDraggedTask(null)
  }

  const reset = () => {
    setAutomated([])
    setHuman([])
    setDraggedTask(null)
    setScore(0)
    setStreak(0)
    setFeedback('Choose a task. Trust your automation instincts.')
  }

  const isPlaced = (id: string) => automated.includes(id) || human.includes(id)

  return (
    <section className="w-full border-y border-white/10 bg-[#101018] px-5 py-20 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-violet-300">
              <Sparkles className="size-4" /> Workflow playground
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">
              Teach your day what to do with a little drag and drop.
            </h2>
            <p className="mt-4 max-w-xl text-white/55">
              Sort the tiny problems of life. This is just for fun, but the idea is very real.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            className="w-fit gap-2 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="size-4" /> Reset board
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-violet-100">
            <Trophy className="size-4 text-amber-300" /> Score: {score}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/70">
            <Zap className="size-4 text-violet-300" /> Streak: {streak}
          </span>
          <span className="text-white/50">{feedback}</span>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 sm:grid-cols-3">
          <div><span className="font-semibold text-white">1. Pick a mission</span><p className="mt-1 text-white/40">Choose a task chip on the left.</p></div>
          <div><span className="font-semibold text-white">2. Sort the task</span><p className="mt-1 text-white/40">Drag it into the lane you think fits.</p></div>
          <div><span className="font-semibold text-white">3. Chase the streak</span><p className="mt-1 text-white/40">Correct automation choices earn points.</p></div>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[0.8fr_1fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">Drag these missions</p>
            <div className="mt-4 flex flex-wrap gap-3 lg:flex-col">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  draggable={!isPlaced(task.id)}
                  onDragStart={() => setDraggedTask(task.id)}
                  onDragEnd={() => setDraggedTask(null)}
                  onClick={() => setDraggedTask(task.id)}
                  className={`cursor-grab rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-violet-300/60 active:cursor-grabbing ${
                    isPlaced(task.id)
                      ? 'border-white/5 bg-white/[0.02] text-white/25'
                      : 'border-white/10 bg-white/[0.06] text-white'
                  }`}
                >
                  <span className="mr-2">{task.emoji}</span>
                  {task.label}
                </button>
              ))}
            </div>
            <div className="mt-7 flex items-center gap-2 text-xs text-white/35">
              <ArrowDown className="size-3.5" /> Click a chip on mobile, then choose a lane
            </div>
          </div>

          <DropLane
            title="Automate this"
            description="Let Fuzzie handle the boring bits."
            tasks={automated}
            draggedTask={draggedTask}
            onDrop={() => placeTask('automated')}
            accent="violet"
          />
          <DropLane
            title="Leave it human"
            description="Some things deserve your full attention."
            tasks={human}
            draggedTask={draggedTask}
            onDrop={() => placeTask('human')}
            accent="amber"
          />
        </div>
      </div>
    </section>
  )
}

function DropLane({
  title,
  description,
  tasks: placedTaskIds,
  draggedTask,
  onDrop,
  accent,
}: {
  title: string
  description: string
  tasks: string[]
  draggedTask: string | null
  onDrop: () => void
  accent: 'violet' | 'amber'
}) {
  const accentClasses = accent === 'violet'
    ? 'border-violet-300/40 bg-violet-400/10'
    : 'border-amber-300/40 bg-amber-400/10'

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onClick={onDrop}
      className={`min-h-56 rounded-2xl border border-dashed p-5 transition ${draggedTask ? accentClasses : 'border-white/10 bg-white/[0.02]'} ${draggedTask ? 'scale-[1.01]' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-1 text-sm text-white/45">{description}</p>
        </div>
        {placedTaskIds.length > 0 && <Check className="size-5 text-emerald-300" />}
      </div>
      <div className="mt-8 flex min-h-20 flex-wrap content-start gap-2">
        {placedTaskIds.length === 0 ? (
          <p className="w-full self-center text-center text-sm text-white/25">Drop a task here</p>
        ) : (
          placedTaskIds.map((taskId) => {
            const task = tasks.find((item) => item.id === taskId)
            return task ? (
              <span key={task.id} className="rounded-lg bg-white/10 px-3 py-2 text-sm">
                {task.emoji} {task.label}
              </span>
            ) : null
          })
        )}
      </div>
    </div>
  )
}
