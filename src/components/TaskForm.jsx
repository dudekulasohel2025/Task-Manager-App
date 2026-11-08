import { useState } from 'react'

function TaskForm({ onAdd }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Please enter a task title.')
      return
    }

    onAdd({ title: trimmedTitle, priority, dueDate: dueDate || null })
    setTitle('')
    setPriority('Medium')
    setDueDate('')
    setError('')
  }

  return (
    <form className="add-task-form" onSubmit={handleSubmit} noValidate>
      <div className="add-title-wrap">
        <label className="sr-only" htmlFor="new-task-title">Task title</label>
        <input
          id="new-task-title"
          className="add-title-input"
          type="text"
          placeholder="What needs to get done?"
          value={title}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'task-title-error' : undefined}
          onChange={(event) => {
            setTitle(event.target.value)
            if (error) setError('')
          }}
        />
        {error && <span className="form-error" id="task-title-error">{error}</span>}
      </div>
      <div className="add-form-options">
        <label className="form-select-wrap">
          <span className="sr-only">Priority</span>
          <span className={`priority-dot priority-dot-${priority.toLowerCase()}`} aria-hidden="true" />
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="Low">Low priority</option>
            <option value="Medium">Medium priority</option>
            <option value="High">High priority</option>
          </select>
        </label>
        <label className="date-input-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17" /></svg>
          <span className="sr-only">Due date (optional)</span>
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <button className="button button-primary add-button" type="submit">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          <span>Add task</span>
        </button>
      </div>
    </form>
  )
}

export default TaskForm
