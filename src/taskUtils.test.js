import { describe, expect, it } from 'vitest'
import {
  filterTasks,
  formatDueDate,
  isOverdue,
  isTaskList,
  sortTasks,
} from './taskUtils.js'
import starterTasks from '../public/tasks.json'

describe('task data validation', () => {
  it('accepts the starter data and rejects invalid task shapes', () => {
    expect(isTaskList(starterTasks)).toBe(true)
    expect(isTaskList(null)).toBe(false)
    expect(isTaskList([{ ...starterTasks[0], priority: 'Urgent' }])).toBe(false)
    expect(isTaskList([{ ...starterTasks[0], completed: 'false' }])).toBe(false)
  })
})

describe('task filtering', () => {
  it('combines completion filters with case-insensitive title search', () => {
    expect(filterTasks(starterTasks, 'Active', '  CHECKOUT ').map((task) => task.title))
      .toEqual(['Fix checkout bug'])
    expect(filterTasks(starterTasks, 'Completed', ' ').map((task) => task.title))
      .toEqual(['Set up project repo', 'Plan team outing'])
    expect(filterTasks(starterTasks, 'All', 'not found')).toEqual([])
  })
})

describe('task sorting', () => {
  it('sorts by due date with missing dates last without mutating the source', () => {
    expect(sortTasks(starterTasks, 'dueDate').map((task) => task.title)).toEqual([
      'Set up project repo',
      'Fix checkout bug',
      'Design login screen',
      'Write API docs',
      'Plan team outing',
    ])
    expect(starterTasks.map((task) => task.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts priority from High to Low and breaks ties by due date', () => {
    expect(sortTasks(starterTasks, 'priority').map((task) => task.title)).toEqual([
      'Set up project repo',
      'Fix checkout bug',
      'Design login screen',
      'Write API docs',
      'Plan team outing',
    ])
  })
})

describe('task dates', () => {
  it('identifies only active tasks with dates before today as overdue', () => {
    const today = new Date(2026, 10, 8)
    expect(starterTasks.filter((task) => isOverdue(task, today)).map((task) => task.title))
      .toEqual(['Fix checkout bug'])
    expect(isOverdue({ dueDate: '2026-11-08', completed: false }, today)).toBe(false)
    expect(isOverdue({ dueDate: '2026-11-07', completed: true }, today)).toBe(false)
    expect(isOverdue({ dueDate: null, completed: false }, today)).toBe(false)
  })

  it('formats calendar dates without shifting and handles missing dates', () => {
    expect(formatDueDate('2026-01-10')).toBe('Jan 10, 2026')
    expect(formatDueDate(null)).toBe('No due date')
  })
})
