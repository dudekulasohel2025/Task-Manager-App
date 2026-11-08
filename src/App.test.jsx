import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import starterTasks from '../public/tasks.json'

function mockTaskFetch() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => structuredClone(starterTasks),
  }))
}

describe('task manager', () => {
  beforeEach(() => {
    localStorage.clear()
    mockTaskFetch()
  })

  it('loads starter tasks and shows the assessment counter and overdue task', async () => {
    render(<App />)

    expect(await screen.findByText('3 tasks left')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getByText('Fix checkout bug').closest('article'))
      .toHaveTextContent('Overdue')
    expect(screen.getAllByText('Overdue')).toHaveLength(1)
    expect(localStorage.getItem('task-manager-tasks')).not.toBeNull()
  })

  it('shows a loading error and can retry the failed fetch', async () => {
    const user = userEvent.setup()
    fetch.mockRejectedValueOnce(new Error('Network unavailable'))
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load your tasks')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('3 tasks left')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('uses valid saved tasks without fetching the starter file', async () => {
    const savedTasks = [{
      id: 99,
      title: 'Saved task',
      priority: 'Low',
      dueDate: null,
      completed: false,
    }]
    localStorage.setItem('task-manager-tasks', JSON.stringify(savedTasks))
    render(<App />)

    expect(await screen.findByText('Saved task')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects blank titles and adds a trimmed task with Enter and defaults', async () => {
    const user = userEvent.setup()
    render(<App />)
    const titleInput = await screen.findByRole('textbox', { name: 'Task title' })

    await user.type(titleInput, '   ')
    await user.keyboard('{Enter}')
    expect(screen.getByText('Please enter a task title.')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(5)

    await user.clear(titleInput)
    await user.type(titleInput, '  New assessment task  ')
    await user.keyboard('{Enter}')
    expect(screen.getByText('New assessment task')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('task-manager-tasks'))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'New assessment task',
          priority: 'Medium',
          dueDate: null,
          completed: false,
        }),
      ]),
    )
  })

  it('filters, searches, sorts, and updates the active task counter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('3 tasks left')

    await user.click(screen.getByRole('tab', { name: 'Active' }))
    expect(screen.getAllByRole('article')).toHaveLength(3)
    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'CHECKOUT')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('Fix checkout bug')).toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'Search tasks' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'priority')
    const visibleTitles = screen.getAllByRole('article')
      .map((article) => article.querySelector('.task-title').textContent)
    expect(visibleTitles).toEqual([
      'Fix checkout bug',
      'Design login screen',
      'Write API docs',
    ])
  })

  it('edits a title with Enter, rejects blanks, and cancels with Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('3 tasks left')

    await user.click(screen.getByRole('button', { name: 'Edit Design login screen' }))
    const editInput = screen.getByRole('textbox', { name: 'Edit task title' })
    await user.clear(editInput)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Title cannot be blank.')).toBeInTheDocument()

    await user.clear(editInput)
    await user.type(editInput, 'Temporary title')
    await user.keyboard('{Escape}')
    expect(screen.getByText('Design login screen')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Design login screen' }))
    await user.clear(screen.getByRole('textbox', { name: 'Edit task title' }))
    await user.type(screen.getByRole('textbox', { name: 'Edit task title' }), 'Updated title')
    await user.keyboard('{Enter}')
    expect(screen.getByText('Updated title')).toBeInTheDocument()
  })

  it('confirms deletion, then restores the task with Undo and persists it', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await screen.findByText('3 tasks left')

    await user.click(screen.getByRole('button', { name: 'Delete Write API docs' }))
    expect(screen.queryByText('Write API docs')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Task deleted.')

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('Write API docs')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('task-manager-tasks')))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ title: 'Write API docs' }),
      ]))
  })

  it('expires the Undo action after five seconds', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await screen.findByText('3 tasks left')
    vi.useFakeTimers()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Write API docs' }))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4999)
    })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect(screen.queryByText('Write API docs')).not.toBeInTheDocument()
  })

  it('does not delete a task when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    await screen.findByText('3 tasks left')

    await user.click(screen.getByRole('button', { name: 'Delete Write API docs' }))
    expect(screen.getByText('Write API docs')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('remembers the selected theme', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('3 tasks left')

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    })
    expect(localStorage.getItem('task-manager-theme')).toBe('dark')
  })
})
