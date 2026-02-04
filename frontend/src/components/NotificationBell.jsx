import { useState } from 'react'
import './NotificationBell.css'

export default function NotificationBell({ notifications, onClear }) {
  const [open, setOpen] = useState(false)
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  const getIcon = (type) => {
    switch (type) {
      case 'trade': return '🔄'
      case 'roll': return '🎲'
      case 'fate': return '✨'
      default: return '📢'
    }
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="notification-bell">
      <button 
        className={`bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setOpen(!open)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div className="notification-overlay" onClick={() => setOpen(false)} />
          <div className="notification-dropdown">
            <div className="notification-header">
              <span>Notificações</span>
              {notifications?.length > 0 && (
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    onClear?.()
                    setOpen(false)
                  }}
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="notification-list">
              {!notifications?.length ? (
                <div className="notification-empty">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  >
                    <span className="notification-icon">
                      {getIcon(notif.notification_type)}
                    </span>
                    <div className="notification-content">
                      <strong>{notif.title}</strong>
                      <p>{notif.message}</p>
                      <span className="notification-time">{formatTime(notif.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
