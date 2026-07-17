import type { SyncedState } from '../types'

// Unión por id: manda el orden y la versión remota, y lo local que el remoto
// no conoce se agrega al final. `pickNewer` permite resolver por timestamp.
export function mergeById<T extends { id: string }>(
  remote: T[],
  local: T[],
  pickNewer?: (remoteItem: T, localItem: T) => T,
): T[] {
  const remoteIds = new Set(remote.map((item) => item.id))
  const localById = new Map(local.map((item) => [item.id, item]))
  const merged = remote.map((remoteItem) => {
    const localItem = localById.get(remoteItem.id)
    return localItem && pickNewer
      ? pickNewer(remoteItem, localItem)
      : remoteItem
  })
  return [...merged, ...local.filter((item) => !remoteIds.has(item.id))]
}

export function mergeState(
  remote: SyncedState,
  local: SyncedState,
): SyncedState {
  return {
    taskLists: mergeById(remote.taskLists ?? [], local.taskLists ?? []),
    todos: mergeById(remote.todos ?? [], local.todos ?? []),
    notebooks: mergeById(remote.notebooks ?? [], local.notebooks ?? []),
    notes: mergeById(remote.notes ?? [], local.notes ?? [], (r, l) =>
      l.updatedAt > r.updatedAt ? l : r,
    ),
  }
}
