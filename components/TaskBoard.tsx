"use client"

import { useState, useId } from 'react'
import { Plus, Circle, Clock, CheckCircle2, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react'

type TaskStatus = 'todo' | 'in-progress' | 'done'

interface Task {
  id: string
  title: string
  status: TaskStatus
}

interface Column {
  key: TaskStatus
  label: string
  icon: React.ReactNode
  headerClass: string
  badgeClass: string
}

const COLUMNS: Column[] = [
  {
    key: 'todo',
    label: 'To Do',
    icon: <Circle className="w-4 h-4" />,
    headerClass: 'text-gray-600',
    badgeClass: 'bg-gray-100 text-gray-600',
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    icon: <Clock className="w-4 h-4" />,
    headerClass: 'text-amber-600',
    badgeClass: 'bg-amber-50 text-amber-600',
  },
  {
    key: 'done',
    label: 'Done',
    icon: <CheckCircle2 className="w-4 h-4" />,
    headerClass: 'text-green-600',
    badgeClass: 'bg-green-50 text-green-600',
  },
]

const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'done']

interface TaskBoardProps {
  projectId: string
}

// projectId is available for future persistence (e.g. save tasks to Supabase)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function TaskBoard({ projectId }: TaskBoardProps) {
  const uid = useId()
  const [tasks, setTasks] = useState<Task[]>([
    { id: `${uid}-1`, title: 'Projektstruktur planen', status: 'done' },
    { id: `${uid}-2`, title: 'Datenbankschema erstellen', status: 'in-progress' },
    { id: `${uid}-3`, title: 'UI-Komponenten umsetzen', status: 'todo' },
  ])
  const [newTitle, setNewTitle] = useState('')

  const addTask = () => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    setTasks((prev) => [
      ...prev,
      { id: `${uid}-${Date.now()}`, title: trimmed, status: 'todo' },
    ])
    setNewTitle('')
  }

  const moveTask = (id: string, direction: 'forward' | 'back') => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task
        const idx = STATUS_ORDER.indexOf(task.status)
        const next = direction === 'forward' ? idx + 1 : idx - 1
        if (next < 0 || next >= STATUS_ORDER.length) return task
        return { ...task, status: STATUS_ORDER[next] }
      })
    )
  }

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const tasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status)

  return (
    <div className="space-y-5">
      {/* Add Task Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Neue Aufgabe hinzufügen…"
          className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
        />
        <button
          onClick={addTask}
          disabled={!newTitle.trim()}
          className="flex items-center gap-1.5 bg-brand hover:bg-[#B58E62] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Hinzufügen
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.key)
          return (
            <div key={col.key} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              {/* Column Header */}
              <div className={`flex items-center justify-between mb-3 ${col.headerClass}`}>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {col.icon}
                  {col.label}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.badgeClass}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="space-y-2 min-h-[80px]">
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    Keine Aufgaben
                  </p>
                )}
                {colTasks.map((task) => {
                  const idx = STATUS_ORDER.indexOf(task.status)
                  return (
                    <div
                      key={task.id}
                      className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm group"
                    >
                      <p className="text-sm text-gray-800 font-medium leading-snug mb-2">{task.title}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {idx > 0 && (
                            <button
                              onClick={() => moveTask(task.id, 'back')}
                              title="Zurück"
                              className="p-1 rounded text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < STATUS_ORDER.length - 1 && (
                            <button
                              onClick={() => moveTask(task.id, 'forward')}
                              title="Weiter"
                              className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          title="Löschen"
                          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
