import {
  CloudCheck,
  CloudSlash,
  CloudArrowUp,
  SignOut,
} from '@phosphor-icons/react'
import type { CloudSync } from '../hooks/useCloudSync'

interface SyncPanelProps {
  sync: CloudSync
}

export function SyncPanel({ sync }: SyncPanelProps) {
  if (!sync.enabled || !sync.email) return null

  return (
    <div className="sync-panel">
      <p className="sync-status">
        {sync.status === 'error' ? (
          <CloudSlash aria-hidden="true" size={16} />
        ) : sync.status === 'syncing' ? (
          <CloudArrowUp aria-hidden="true" size={16} />
        ) : (
          <CloudCheck aria-hidden="true" size={16} />
        )}
        <span className="sync-status-text">
          {sync.status === 'error'
            ? 'Error de sincronización'
            : sync.status === 'syncing'
              ? 'Sincronizando…'
              : 'Sincronizado'}
        </span>
      </p>
      <p className="sync-email" title={sync.email}>
        {sync.email}
      </p>
      <button
        type="button"
        className="sidebar-settings-item"
        onClick={() => void sync.signOut()}
      >
        <span>Cerrar sesión</span>
        <SignOut aria-hidden="true" size={16} />
      </button>
    </div>
  )
}
