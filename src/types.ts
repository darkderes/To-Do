export type Priority = 'low' | 'medium' | 'high'

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export const MY_DAY_ID = 'my-day'

export function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface Todo {
  id: string
  text: string
  completed: boolean
  listId: string
  dueDate?: string
  priority?: Priority
  myDay?: string
}

export interface TaskList {
  id: string
  name: string
}
