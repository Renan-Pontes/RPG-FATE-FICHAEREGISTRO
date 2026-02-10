import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import * as api from '../api'
import './MessagesPanel.css'

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function MessagesPanel({ campaign, party = [], messages = [], onRefresh }) {
  const { user, isGameMaster } = useAuth()
  const [selectedRecipientId, setSelectedRecipientId] = useState(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const players = useMemo(() => {
    const map = new Map()
    party.forEach(char => {
      if (!char.owner || char.is_npc) return
      if (!map.has(char.owner)) {
        map.set(char.owner, {
          id: char.owner,
          username: char.owner_username,
          characterName: char.name,
        })
      }
    })
    return Array.from(map.values())
  }, [party])

  useEffect(() => {
    if (!isGameMaster) return
    if (!selectedRecipientId && players.length > 0) {
      setSelectedRecipientId(players[0].id)
    }
  }, [isGameMaster, players, selectedRecipientId])

  const activeRecipientId = isGameMaster ? selectedRecipientId : campaign?.owner

  const threadMessages = useMemo(() => {
    if (!activeRecipientId) return []
    return (messages || []).filter(msg => (
      (msg.sender === user?.id && msg.recipient === activeRecipientId) ||
      (msg.recipient === user?.id && msg.sender === activeRecipientId)
    ))
  }, [messages, activeRecipientId, user?.id])

  const canSendAsPlayer = useMemo(() => {
    if (!user) return false
    return party.some(char => char.owner === user.id)
  }, [party, user])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!campaign || !activeRecipientId) return
    if (!content.trim()) return

    setSending(true)
    setError('')
    try {
      await api.sendMessage(campaign.id, activeRecipientId, content.trim())
      setContent('')
      onRefresh?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="messages-panel">
      <div className="messages-header">
        <div>
          <h3>Mensagens Secretas</h3>
          <p className="text-muted text-sm">
            {isGameMaster
              ? 'Converse privadamente com cada jogador.'
              : 'Converse privadamente com o mestre da campanha.'}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error mb-3">{error}</div>}

      <div className="messages-layout">
        {isGameMaster && (
          <div className="messages-sidebar">
            <h4 className="text-xs mb-2">Jogadores</h4>
            {players.length === 0 ? (
              <p className="text-muted text-sm">Nenhum jogador na campanha.</p>
            ) : (
              <div className="list">
                {players.map(player => (
                  <button
                    key={player.id}
                    className={`message-player ${selectedRecipientId === player.id ? 'active' : ''}`}
                    onClick={() => setSelectedRecipientId(player.id)}
                  >
                    <strong>@{player.username}</strong>
                    <span className="text-xs text-muted">{player.characterName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="messages-thread">
          {!activeRecipientId && (
            <p className="text-muted text-sm">Selecione um jogador para iniciar.</p>
          )}

          {activeRecipientId && (
            <>
              <div className="messages-list">
                {threadMessages.length === 0 ? (
                  <p className="text-muted text-sm">Nenhuma mensagem ainda.</p>
                ) : (
                  threadMessages.map(msg => {
                    const mine = msg.sender === user?.id
                    return (
                      <div key={msg.id} className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>
                        <div className="message-content">{msg.content}</div>
                        <div className="message-meta">
                          <span>{mine ? 'Você' : msg.sender_username}</span>
                          <span>{formatTime(msg.created_at)}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {(!isGameMaster && !canSendAsPlayer) ? (
                <p className="text-muted text-sm">Crie um personagem para enviar mensagens.</p>
              ) : (
                <form className="message-composer" onSubmit={handleSend}>
                  <textarea
                    className="textarea input"
                    rows={3}
                    placeholder="Digite uma mensagem secreta..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                  <button className="btn btn-primary" disabled={sending || !content.trim()}>
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
