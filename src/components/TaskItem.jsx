import { useEffect, useRef, useState } from 'react'
import { formatDueDate, isOverdue } from '../taskUtils.js'

function TaskItem({ task, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(task.title)
  const [editError, setEditError] = useState('')
  const editInputRef = useRef(null)
  const overdue = isOverdue(task)

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus()
  }, [isEditing])

  function saveEdit(event) {
    event.preventDefault()
    const trimmedTitle = editedTitle.trim()
    if (!trimmedTitle) {
      setEditError('Title cannot be blank.')
      return
    }
    onUpdate({ ...task, title: trimmedTitle })
    setIsEditing(false)
    setEditError('')
  }

  function cancelEdit() {
    setEditedTitle(task.title)
    setEditError('')
    setIsEditing(false)
  }

  return (
    <article className={`task-row${task.completed ? ' is-completed' : ''}`}>
      <label className="task-check-wrap">
        <input
          className="task-checkbox"
          type="checkbox"
          checked={task.completed}
          onChange={(event) => onUpdate({ ...task, completed: event.target.checked })}
          aria-label={`${task.completed ? 'Mark' : 'Complete'} ${task.title}`}
        />
        <span className="custom-checkbox" aria-hidden="true">
          <svg viewBox="0 0 16 16"><path d="m3.5 8.3 2.8 2.8 6.2-6.2" /></svg>
        </span>
      </label>

      <div className="task-main">
        {isEditing ? (
          <form className="edit-form" onSubmit={saveEdit}>
            <input
              ref={editInputRef}
              className="edit-title-input"
              type="text"
              value={editedTitle}
              aria-label="Edit task title"
              aria-invalid={Boolean(editError)}
              aria-describedby={editError ? `edit-error-${task.id}` : undefined}
              onChange={(event) => {
                setEditedTitle(event.target.value)
                if (editError) setEditError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') cancelEdit()
              }}
            />
            <button type="submit" className="text-action save-action">Save</button>
            <button type="button" className="text-action" onClick={cancelEdit}>Cancel</button>
            {editError && <span id={`edit-error-${task.id}`} className="form-error">{editError}</span>}
          </form>
        ) : (
          <>
            <span className="task-title">{task.title}</span>
            <div className="task-meta">
              <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                <span className="priority-dot" aria-hidden="true" />
                {task.priority}
              </span>
              <span className="task-date">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17" /></svg>
                {formatDueDate(task.dueDate)}
              </span>
              {overdue && <span className="overdue-label">Overdue</span>}
            </div>
          </>
        )}
      </div>

      {!isEditing && (
        <div className="task-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={`Edit ${task.title}`}
            onClick={() => {
              setEditedTitle(task.title)
              setIsEditing(true)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.5 5.5 3 3M4 20l4.3-.9L19.2 8.2a2.1 2.1 0 0 0-3-3L5.3 16.1 4 20Z" /></svg>
          </button>
          <button
            type="button"
            className="icon-button delete-button"
            aria-label={`Delete ${task.title}`}
            onClick={() => onDelete(task.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M10 11v6m4-6v6M6.5 7l.8 13h9.4l.8-13M9 7V4h6v3" /></svg>
          </button>
        </div>
      )}
    </article>
  )
}

export default TaskItem
