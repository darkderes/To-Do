export type Priority = 'low' | 'medium' | 'high'

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export interface Todo {
  id: string
  text: string
  completed: boolean
  listId: string
  dueDate?: string
  priority?: Priority
}

export interface TaskList {
  id: string
  name: string
}

export type Filter = 'all' | 'active' | 'completed'
