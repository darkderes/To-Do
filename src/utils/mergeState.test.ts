import { describe, expect, it } from 'vitest'
import { mergeById, mergeState } from './mergeState'
import type { SyncedState } from '../types'

describe('mergeById', () => {
  it('keeps remote order and appends local-only items', () => {
    const remote = [{ id: 'a' }, { id: 'b' }]
    const local = [{ id: 'b' }, { id: 'c' }]
    expect(mergeById(remote, local)).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ])
  })

  it('resolves shared ids with pickNewer when provided', () => {
    const remote = [{ id: 'a', v: 'remota' }]
    const local = [{ id: 'a', v: 'local' }]
    const merged = mergeById(remote, local, (r, l) => (l.v === 'local' ? l : r))
    expect(merged).toEqual([{ id: 'a', v: 'local' }])
  })
})

describe('mergeState', () => {
  it('prefers the newer note by updatedAt and unions everything else', () => {
    const base = {
      id: 'n1',
      notebookId: 'nb1',
      title: '',
      content: '',
      images: {},
      createdAt: 1,
    }
    const remote: SyncedState = {
      taskLists: [{ id: 'l1', name: 'Remota' }],
      todos: [],
      notebooks: [{ id: 'nb1', name: 'NB' }],
      notes: [{ ...base, title: 'vieja', updatedAt: 10 }],
    }
    const local: SyncedState = {
      taskLists: [{ id: 'l2', name: 'Local' }],
      todos: [{ id: 't1', text: 'x', completed: false, listId: 'l2' }],
      notebooks: [{ id: 'nb1', name: 'NB local' }],
      notes: [{ ...base, title: 'nueva', updatedAt: 20 }],
    }

    const merged = mergeState(remote, local)

    expect(merged.taskLists.map((l) => l.id)).toEqual(['l1', 'l2'])
    expect(merged.todos).toHaveLength(1)
    expect(merged.notebooks).toEqual([{ id: 'nb1', name: 'NB' }])
    expect(merged.notes[0].title).toBe('nueva')
  })

  it('tolerates missing collections in the remote payload', () => {
    const local: SyncedState = {
      taskLists: [],
      todos: [],
      notebooks: [],
      notes: [],
    }
    const merged = mergeState({} as SyncedState, local)
    expect(merged).toEqual(local)
  })
})
