import { useState } from 'react'
import * as api from '../api'
import NotesPanel from './NotesPanel'
import './PartyPanel.css'

const STATS = [
  { key: 'forca', label: 'FOR' },
  { key: 'destreza', label: 'DES' },
  { key: 'vigor', label: 'VIG' },
  { key: 'inteligencia', label: 'INT' },
  { key: 'sabedoria', label: 'SAB' },
  { key: 'carisma', label: 'CAR' },
]

export default function PartyPanel({ party, campaign, skills, traits = [], onUpdate }) {
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [editStats, setEditStats] = useState({})
  const [selectedSkillIds, setSelectedSkillIds] = useState([])
  const [selectedTraitIds, setSelectedTraitIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [banningId, setBanningId] = useState(null)
  const [standForm, setStandForm] = useState({
    name: '',
    stand_type: '',
    description: '',
    notes: '',
  })
  const [creatingStand, setCreatingStand] = useState(false)
  const [rollRequestTarget, setRollRequestTarget] = useState(null)
  const [rollSkillId, setRollSkillId] = useState('')
  const [rollDescription, setRollDescription] = useState('')
  const [requestingRoll, setRequestingRoll] = useState(false)

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
      stand_unlocked: !!char.stand_unlocked,
      cursed_energy_unlocked: !!char.cursed_energy_unlocked,
      cursed_energy: char.cursed_energy || 0,
      zanpakuto_unlocked: !!char.zanpakuto_unlocked,
      shikai_unlocked: !!char.shikai_unlocked,
      bankai_unlocked: !!char.bankai_unlocked,
    })
    setSelectedSkillIds((char.skills || []).map(s => s.id))
    setSelectedTraitIds((char.personality_traits || []).map(t => t.id))
    setStandForm({
      name: '',
      stand_type: '',
      description: '',
      notes: '',
    })
  }

  const handleSaveStats = async () => {
    if (!selectedCharacter) return
    
    setSaving(true)
    try {
      await api.updateCharacterStats(selectedCharacter.id, editStats)
      await api.updateCharacter(selectedCharacter.id, {
        skill_ids: selectedSkillIds,
        personality_trait_ids: selectedTraitIds,
      })
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

  const handleCreateStand = async (e) => {
    e.preventDefault()
    if (!selectedCharacter || !standForm.name.trim()) return

    setCreatingStand(true)
    try {
      await api.createStand({
        ...standForm,
        owner_character: selectedCharacter.id,
      })
      setStandForm({
        name: '',
        stand_type: '',
        description: '',
        notes: '',
      })
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingStand(false)
    }
  }

  const handleRequestRoll = async (e) => {
    e?.preventDefault()
    if (!campaign || !rollRequestTarget) return

    setRequestingRoll(true)
    try {
      await api.requestRoll(
        campaign.id,
        rollRequestTarget.id,
        rollSkillId ? parseInt(rollSkillId) : null,
        rollDescription
      )
      setRollSkillId('')
      setRollDescription('')
      setRollRequestTarget(null)
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setRequestingRoll(false)
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
              <button
                className="btn btn-sm btn-primary w-full mt-2"
                onClick={() => {
                  setRollSkillId('')
                  setRollDescription('')
                  setRollRequestTarget(char)
                }}
              >
                Solicitar Rolagem
              </button>
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

              {skills?.length > 0 && (
                <div className="form-group mt-4">
                  <label className="label">Perícias</label>
                  <div className="list">
                    {skills.map(skill => {
                      const checked = selectedSkillIds.includes(skill.id)
                      return (
                        <label key={skill.id} className="list-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedSkillIds(prev => [...prev, skill.id])
                              } else {
                                setSelectedSkillIds(prev => prev.filter(id => id !== skill.id))
                              }
                            }}
                          />
                          <span className="ml-2">{skill.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {traits.length > 0 && (
                <div className="form-group mt-4">
                  <label className="label">Traços de Personalidade (máx. 5)</label>
                  <div className="list">
                    {traits.map(trait => {
                      const checked = selectedTraitIds.includes(trait.id)
                      const disabled = !checked && selectedTraitIds.length >= 5
                      return (
                        <label key={trait.id} className="list-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedTraitIds(prev => [...prev, trait.id])
                              } else {
                                setSelectedTraitIds(prev => prev.filter(id => id !== trait.id))
                              }
                            }}
                          />
                          <span className="ml-2">
                            {trait.name} (+{trait.bonus} {trait.use_status})
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {campaign?.campaign_type === 'jojo' && (
                <div className="form-group mt-4">
                  <label className="label">Stand</label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editStats.stand_unlocked}
                      onChange={e => setEditStats(prev => ({
                        ...prev,
                        stand_unlocked: e.target.checked
                      }))}
                    />
                    <span>Stand liberado</span>
                  </label>
                  {selectedCharacter?.stand ? (
                    <p className="text-xs text-muted mt-2">
                      Stand definido: {selectedCharacter.stand.name}
                    </p>
                  ) : editStats.stand_unlocked ? (
                    <form onSubmit={handleCreateStand} className="card mt-2">
                      <input
                        type="text"
                        className="input"
                        placeholder="Nome do Stand"
                        value={standForm.name}
                        onChange={e => setStandForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <input
                        type="text"
                        className="input mt-2"
                        placeholder="Tipo / Classe"
                        value={standForm.stand_type}
                        onChange={e => setStandForm(prev => ({ ...prev, stand_type: e.target.value }))}
                      />
                      <textarea
                        className="textarea input mt-2"
                        placeholder="Descrição / ideia"
                        value={standForm.description}
                        onChange={e => setStandForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                      <textarea
                        className="textarea input mt-2"
                        placeholder="Poderes / observações"
                        value={standForm.notes}
                        onChange={e => setStandForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                      />
                      <button className="btn btn-sm btn-primary mt-2" disabled={creatingStand}>
                        {creatingStand ? 'Criando...' : 'Criar Stand'}
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-muted mt-2">
                      Libere o Stand para definir.
                    </p>
                  )}
                </div>
              )}

              {campaign?.campaign_type === 'jjk' && (
                <div className="form-group mt-4">
                  <label className="label">Energia Amaldiçoada</label>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={editStats.cursed_energy_unlocked}
                      onChange={e => setEditStats(prev => ({
                        ...prev,
                        cursed_energy_unlocked: e.target.checked
                      }))}
                    />
                    <span>Energia liberada</span>
                  </label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={editStats.cursed_energy}
                    onChange={e => setEditStats(prev => ({
                      ...prev,
                      cursed_energy: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              )}

              {campaign?.campaign_type === 'bleach' && (
                <div className="form-group mt-4">
                  <label className="label">Zanpakutou</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editStats.zanpakuto_unlocked}
                        onChange={e => setEditStats(prev => ({
                          ...prev,
                          zanpakuto_unlocked: e.target.checked
                        }))}
                      />
                      <span>Zanpakutou liberada</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editStats.shikai_unlocked}
                        onChange={e => setEditStats(prev => ({
                          ...prev,
                          shikai_unlocked: e.target.checked
                        }))}
                      />
                      <span>Shikai liberada</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editStats.bankai_unlocked}
                        onChange={e => setEditStats(prev => ({
                          ...prev,
                          bankai_unlocked: e.target.checked
                        }))}
                      />
                      <span>Bankai liberada</span>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <NotesPanel character={selectedCharacter} isGameMaster />
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

      {rollRequestTarget && (
        <div className="modal-backdrop" onClick={() => setRollRequestTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Solicitar Rolagem</h3>
              <button 
                className="btn btn-ghost btn-icon"
                onClick={() => setRollRequestTarget(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRequestRoll}>
              <div className="modal-body">
                <p className="text-sm text-muted mb-3">
                  Para: <strong>{rollRequestTarget.name}</strong>
                </p>
                <div className="form-group">
                  <label className="label">Skill (opcional)</label>
                  <select
                    className="input"
                    value={rollSkillId}
                    onChange={e => setRollSkillId(e.target.value)}
                  >
                    <option value="">Nenhuma skill</option>
                    {skills?.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (+{s.bonus})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Descrição</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Teste de percepção..."
                    value={rollDescription}
                    onChange={e => setRollDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRollRequestTarget(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={requestingRoll}
                >
                  {requestingRoll ? 'Enviando...' : 'Solicitar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
