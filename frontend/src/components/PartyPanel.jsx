import { useState } from 'react'
import * as api from '../api'
import './PartyPanel.css'

const STATS = [
  { key: 'forca', label: 'FOR' },
  { key: 'destreza', label: 'DES' },
  { key: 'vigor', label: 'VIG' },
  { key: 'inteligencia', label: 'INT' },
  { key: 'sabedoria', label: 'SAB' },
  { key: 'carisma', label: 'CAR' },
]

export default function PartyPanel({ party, campaign, skills, onUpdate }) {
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [editStats, setEditStats] = useState({})
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [banningId, setBanningId] = useState(null)

  const openCharacter = (char) => {
    setSelectedCharacter(char)
    setEditStats({
      forca: char.forca || 0,
      destreza: char.destreza || 0,
      vigor: char.vigor || 0,
      inteligencia: char.inteligencia || 0,
      sabedoria: char.sabedoria || 0,
      carisma: char.carisma || 0,
      fate_points: char.fate_points || 0,
      status: char.status || '',
    })
  }

  const handleSaveStats = async () => {
    if (!selectedCharacter) return
    
    setSaving(true)
    try {
      await api.updateCharacterStats(selectedCharacter.id, editStats)
      onUpdate?.()
      setSelectedCharacter(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddFatePoint = async (charId) => {
    try {
      await api.addFatePoint(charId, 1)
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRemoveFatePoint = async (charId) => {
    try {
      await api.addFatePoint(charId, -1)
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRemovePlayer = async (char) => {
    if (!campaign) return
    if (!confirm(`Remover ${char.name} da campanha? Ele poderá criar novamente.`)) {
      return
    }

    setRemovingId(char.id)
    try {
      await api.removePlayerFromCampaign(campaign.id, char.owner)
      if (selectedCharacter?.id === char.id) {
        setSelectedCharacter(null)
      }
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  const handleBanPlayer = async (char) => {
    if (!campaign) return
    if (!confirm(`Banir ${char.name} da campanha? Isso remove o personagem e bloqueia o acesso.`)) {
      return
    }
    const reason = prompt('Motivo do banimento (opcional):', '') || ''

    setBanningId(char.id)
    try {
      await api.banPlayerFromCampaign(campaign.id, char.owner, reason)
      if (selectedCharacter?.id === char.id) {
        setSelectedCharacter(null)
      }
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setBanningId(null)
    }
  }

  return (
    <div className="party-panel">
      <h3>👥 Party ({party.length} jogadores)</h3>
      
      <div className="party-list">
        {party.length === 0 ? (
          <p className="text-muted text-sm">Nenhum jogador ainda.</p>
        ) : (
          party.map(char => (
            <div key={char.id} className="party-card">
              <div className="party-card-header">
                <div className="party-avatar">
                  {char.image ? (
                    <img src={char.image} alt={char.name} />
                  ) : (
                    <span>{char.name.charAt(0)}</span>
                  )}
                </div>
                <div className="party-info">
                  <strong>{char.name}</strong>
                  <span className="text-xs text-muted">
                    @{char.owner_username}
                  </span>
                </div>
                <div className="party-fate">
                  <button 
                    className="fate-btn"
                    onClick={() => handleRemoveFatePoint(char.id)}
                  >
                    −
                  </button>
                  <span className="fate-value">{char.fate_points}</span>
                  <button 
                    className="fate-btn"
                    onClick={() => handleAddFatePoint(char.id)}
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Stats ocultos */}
              <div className="party-stats">
                {STATS.map(stat => (
                  <div key={stat.key} className="stat-mini">
                    <span className="stat-label">{stat.label}</span>
                    <span className={`stat-val ${char[stat.key] >= 0 ? 'positive' : 'negative'}`}>
                      {char[stat.key] >= 0 ? '+' : ''}{char[stat.key]}
                    </span>
                  </div>
                ))}
              </div>
              
              <button 
                className="btn btn-sm btn-secondary w-full"
                onClick={() => openCharacter(char)}
              >
                Editar Stats
              </button>
              <div className="flex gap-2 mt-2">
                <button
                  className="btn btn-sm btn-secondary w-full"
                  onClick={() => handleRemovePlayer(char)}
                  disabled={removingId === char.id || banningId === char.id}
                >
                  {removingId === char.id ? 'Removendo...' : 'Remover'}
                </button>
                <button
                  className="btn btn-sm btn-danger w-full"
                  onClick={() => handleBanPlayer(char)}
                  disabled={removingId === char.id || banningId === char.id}
                >
                  {banningId === char.id ? 'Banindo...' : 'Banir'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de edição */}
      {selectedCharacter && (
        <div className="modal-backdrop" onClick={() => setSelectedCharacter(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Editar {selectedCharacter.name}</h3>
              <button 
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedCharacter(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="stats-editor">
                {STATS.map(stat => (
                  <div key={stat.key} className="stat-editor-row">
                    <label>{stat.label}</label>
                    <input
                      type="number"
                      className="input"
                      value={editStats[stat.key]}
                      onChange={e => setEditStats(prev => ({
                        ...prev,
                        [stat.key]: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                ))}
              </div>
              
              <div className="form-group mt-4">
                <label className="label">Fate Points</label>
                <input
                  type="number"
                  className="input"
                  value={editStats.fate_points}
                  onChange={e => setEditStats(prev => ({
                    ...prev,
                    fate_points: parseInt(e.target.value) || 0
                  }))}
                />
              </div>
              
              <div className="form-group">
                <label className="label">Status</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Vivo, Ferido, Morto..."
                  value={editStats.status}
                  onChange={e => setEditStats(prev => ({
                    ...prev,
                    status: e.target.value
                  }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setSelectedCharacter(null)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveStats}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
