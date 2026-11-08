const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }

export function isTaskList(value) {
  return Array.isArray(value) && value.every((task) =>
    task !== null &&
    typeof task === 'object' &&
    (typeof task.id === 'number' || typeof task.id === 'string') &&
    typeof task.title === 'string' &&
    ['Low', 'Medium', 'High'].includes(task.priority) &&
    (typeof task.dueDate === 'string' || task.dueDate === null) &&
    typeof task.completed === 'boolean',
  )
}

export function sortTasks(tasks, sortBy) {
  return [...tasks].sort((first, second) => {
    if (sortBy === 'priority') {
      return PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority] ||
        compareDueDates(first.dueDate, second.dueDate)
    }
    return compareDueDates(first.dueDate, second.dueDate)
  })
}

export function filterTasks(tasks, filter, search) {
  const normalizedSearch = search.trim().toLocaleLowerCase()
  return tasks.filter((task) => {
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Active' && !task.completed) ||
      (filter === 'Completed' && task.completed)
    return matchesFilter && task.title.toLocaleLowerCase().includes(normalizedSearch)
  })
}

function compareDueDates(firstDate, secondDate) {
  if (firstDate === null && secondDate === null) return 0
  if (firstDate === null) return 1
  if (secondDate === null) return -1
  return firstDate.localeCompare(secondDate)
}

export function isOverdue(task, today = new Date()) {
  if (task.completed || !task.dueDate) return false
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  return task.dueDate < localToday
}

export function formatDueDate(dueDate) {
  if (!dueDate) return 'No due date'
  const [year, month, day] = dueDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
