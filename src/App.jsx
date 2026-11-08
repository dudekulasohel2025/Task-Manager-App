import { useEffect, useMemo, useRef, useState } from 'react'
import TaskForm from './components/TaskForm.jsx'
import TaskItem from './components/TaskItem.jsx'
import { filterTasks, isTaskList, sortTasks } from './taskUtils.js'
import './App.css'

const TASKS_STORAGE_KEY = 'task-manager-tasks'
const THEME_STORAGE_KEY = 'task-manager-theme'
const FILTERS = ['All', 'Active', 'Completed']

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('dueDate')
  const [theme, setTheme] = useState(getSavedTheme)
  const [saveError, setSaveError] = useState('')
  const [pendingDeletions, setPendingDeletions] = useState([])
  const deletionTimers = useRef(new Map())
  const undoButtonRef = useRef(null)

  async function loadTasks(useSavedTasks = true) {
    try {
      if (useSavedTasks) {
        const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY)
        if (savedTasks !== null) {
          const parsedTasks = JSON.parse(savedTasks)
          if (!isTaskList(parsedTasks)) {
            throw new Error('Saved tasks are not in a valid format.')
          }
          setTasks(parsedTasks)
          setLoading(false)
          return
        }
      }

      const response = await fetch('/tasks.json')
      if (!response.ok) {
        throw new Error(`Task data request failed (${response.status}).`)
      }
      const starterTasks = await response.json()
      if (!isTaskList(starterTasks)) {
        throw new Error('Task data is not in a valid format.')
      }
      setTasks(starterTasks)
      persistTasks(starterTasks)
    } catch {
      setLoadError('We couldn’t load your tasks. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadTasks()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [])

  useEffect(() => () => {
    for (const timerId of deletionTimers.current.values()) {
      window.clearTimeout(timerId)
    }
    deletionTimers.current.clear()
  }, [])

  function persistTasks(nextTasks) {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(nextTasks))
      setSaveError('')
    } catch {
      setSaveError('Your changes could not be saved in this browser.')
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // The theme still works for this visit if browser storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    if (pendingDeletions.length > 0) undoButtonRef.current?.focus()
  }, [pendingDeletions])

  const activeCount = tasks.filter((task) => !task.completed).length
  const visibleTasks = useMemo(() => {
    return sortTasks(filterTasks(tasks, filter, search), sortBy)
  }, [tasks, filter, search, sortBy])

  function addTask(taskDetails) {
    const nextTasks = [
      ...tasks,
      { ...taskDetails, id: Date.now() + Math.random(), completed: false },
    ]
    setTasks(nextTasks)
    persistTasks(nextTasks)
  }

  function updateTask(updatedTask) {
    const nextTasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    setTasks(nextTasks)
    persistTasks(nextTasks)
  }

  function deleteTask(taskId) {
    const task = tasks.find((item) => item.id === taskId)
    if (!task || !window.confirm(`Delete “${task.title}”?`)) return
    const nextTasks = tasks.filter((item) => item.id !== taskId)
    setTasks(nextTasks)
    persistTasks(nextTasks)

    const deletionKey = `${task.id}-${Date.now()}-${Math.random()}`
    const timerId = window.setTimeout(() => {
      setPendingDeletions((currentDeletions) =>
        currentDeletions.filter((deletion) => deletion.key !== deletionKey),
      )
      deletionTimers.current.delete(deletionKey)
    }, 5000)
    deletionTimers.current.set(deletionKey, timerId)
    setPendingDeletions((currentDeletions) => [
      ...currentDeletions,
      { key: deletionKey, task },
    ])
  }

  function undoDelete() {
    const deletion = pendingDeletions[pendingDeletions.length - 1]
    if (!deletion) return

    window.clearTimeout(deletionTimers.current.get(deletion.key))
    deletionTimers.current.delete(deletion.key)
    const nextTasks = [...tasks, deletion.task]
    setTasks(nextTasks)
    persistTasks(nextTasks)
    setPendingDeletions((currentDeletions) =>
      currentDeletions.filter((item) => item.key !== deletion.key),
    )
  }

  if (loading) {
    return (
      <main className="status-page">
        <div className="loading-card" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>Getting your tasks ready…</span>
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="status-page">
        <section className="error-card" role="alert">
          <span className="error-mark" aria-hidden="true">!</span>
          <h1>Tasks are unavailable</h1>
          <p>{loadError}</p>
          <button
            className="button button-primary"
            onClick={() => {
              setLoading(true)
              setLoadError('')
              loadTasks(false)
            }}
          >
            Try again
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Daymark home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>daymark</span>
        </a>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2m0 14v2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42M3 12h2m14 0h2M5.64 18.36l1.42-1.42m9.88-9.88 1.42-1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" /></svg>
          )}
        </button>
      </header>

      <section className="intro">
        <p className="eyebrow">YOUR SPACE, YOUR PACE</p>
        <h1>A little more <span>done.</span></h1>
        <p className="intro-copy">A clear mind starts with a clear list.</p>
      </section>

      <section className="task-panel" aria-label="Task manager">
        <div className="panel-heading">
          <div>
            <h2>My tasks</h2>
            <p className="task-count">
              <span className="count-dot" aria-hidden="true" />
              {activeCount} {activeCount === 1 ? 'task' : 'tasks'} left
            </p>
          </div>
          <div className="filter-tabs" role="tablist" aria-label="Filter tasks">
            {FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={filter === option}
                className={`filter-tab${filter === option ? ' is-selected' : ''}`}
                onClick={() => setFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <TaskForm onAdd={addTask} />

        <div className="list-tools">
          <label className="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.3 4.3" /></svg>
            <span className="sr-only">Search tasks</span>
            <input
              type="search"
              aria-label="Search tasks"
              placeholder="Find a task..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd>/</kbd>
          </label>
          <label className="sort-field">
            <span>Sort by</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="dueDate">Due date</option>
              <option value="priority">Priority</option>
            </select>
          </label>
        </div>

        {saveError && <p className="save-error" role="status">{saveError}</p>}

        {pendingDeletions.length > 0 && (
          <div className="undo-notice" role="status" aria-live="polite">
            <span>
              {pendingDeletions.length === 1
                ? 'Task deleted.'
                : `${pendingDeletions.length} tasks deleted. Undo restores the most recent one.`}
            </span>
            <button
              ref={undoButtonRef}
              type="button"
              className="undo-button"
              onClick={undoDelete}
            >
              Undo
            </button>
          </div>
        )}

        <div className="task-list" aria-live="polite">
          {visibleTasks.length > 0 ? visibleTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          )) : (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                <svg viewBox="0 0 40 40" fill="none">
                  <rect x="8" y="7" width="24" height="28" rx="4" />
                  <path d="M14 15h12M14 21h12M14 27h7" />
                </svg>
              </span>
              <h3>{search ? 'No matching tasks' : 'Nothing on this list'}</h3>
              <p>{search ? 'Try another search.' : 'Add a task above to get started.'}</p>
            </div>
          )}
        </div>

        <footer className="panel-footer">
          <span>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} total</span>
          <span>One step at a time <span aria-hidden="true">✳</span></span>
        </footer>
      </section>

      <footer className="page-footer">Made for the things that matter.</footer>
    </main>
  )
}

export default App
