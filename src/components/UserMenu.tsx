import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  CloudArrowUp,
  CloudCheck,
  CloudSlash,
  Moon,
  SignOut,
  Sun,
  UserCircle,
} from '@phosphor-icons/react'
import type { CloudSync } from '../hooks/useCloudSync'
import { IMAGE_TOO_LARGE_MESSAGE, processImageFile } from '../utils/noteContent'
import type { Profile } from '../types'

const AVATAR_MAX_DIMENSION = 256

interface UserMenuProps {
  sync: CloudSync
  profile: Profile
  onAvatarChange: (dataUrl: string) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  placement: 'sidebar' | 'header'
}

export function UserMenu({
  sync,
  profile,
  onAvatarChange,
  theme,
  onToggleTheme,
  placement,
}: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const showAccount = sync.enabled && !!sync.email

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function handleAvatarPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setAvatarError(null)
    try {
      const dataUrl = await processImageFile(file, AVATAR_MAX_DIMENSION)
      onAvatarChange(dataUrl)
    } catch (error) {
      setAvatarError(
        error instanceof Error ? error.message : IMAGE_TOO_LARGE_MESSAGE,
      )
    }
  }

  return (
    <div className={`user-menu user-menu--${placement}`} ref={menuRef}>
      <button
        type="button"
        className={`user-menu-trigger user-menu-trigger--${placement}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={placement === 'header' ? 'Perfil y configuración' : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="user-menu-trigger-avatar" aria-hidden="true">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" />
          ) : (
            <UserCircle size={20} />
          )}
        </span>
        {placement === 'sidebar' && (
          <span className="user-menu-trigger-label">
            {showAccount ? sync.email : 'Perfil y configuración'}
          </span>
        )}
      </button>
      {open && (
        <div
          className={`user-menu-popover user-menu-popover--${placement}`}
          role="menu"
        >
          <div className="user-menu-header">
            <span className="user-menu-avatar-large" aria-hidden="true">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" />
              ) : (
                <UserCircle size={26} />
              )}
            </span>
            <span className="user-menu-email">
              {showAccount ? sync.email : 'Invitado'}
            </span>
          </div>
          <button
            type="button"
            className="sidebar-settings-item"
            onClick={() => fileInputRef.current?.click()}
          >
            <span>Cambiar foto</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => void handleAvatarPick(event)}
          />
          {avatarError && (
            <p className="login-error" role="alert">
              {avatarError}
            </p>
          )}
          <button
            type="button"
            className="sidebar-settings-item"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'
            }
          >
            <span aria-hidden="true">
              Modo {theme === 'dark' ? 'oscuro' : 'claro'}
            </span>
            <span aria-hidden="true">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </span>
          </button>
          {showAccount && (
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
              {sync.status === 'error' && (
                <button
                  type="button"
                  className="sync-retry"
                  onClick={sync.retry}
                >
                  Reintentar
                </button>
              )}
              <button
                type="button"
                className="sidebar-settings-item"
                onClick={() => {
                  setOpen(false)
                  void sync.signOut()
                }}
              >
                <span>Cerrar sesión</span>
                <SignOut aria-hidden="true" size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
