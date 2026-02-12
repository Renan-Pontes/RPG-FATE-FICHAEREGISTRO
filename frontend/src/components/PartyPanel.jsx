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

export default function PartyPanel({ party, campaign, skills, traits = [], powerIdeas = [], skillIdeas = [], onUpdate }) {
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
  const [ideaResponses, setIdeaResponses] = useState({})
  const [skillIdeaResponses, setSkillIdeaResponses] = useState({})
  const [kidouTier, setKidouTier] = useState(1)
  const [kidouOffering, setKidouOffering] = useState(false)
  const [kidouChoosing, setKidouChoosing] = useState(null)

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
      extra_stand_slots: char.extra_stand_slots || 0,
      cursed_energy_unlocked: !!char.cursed_energy_unlocked,
      cursed_energy: char.cursed_energy || 0,
      extra_cursed_technique_slots: char.extra_cursed_technique_slots || 0,
      zanpakuto_unlocked: !!char.zanpakuto_unlocked,
      extra_zanpakuto_slots: char.extra_zanpakuto_slots || 0,
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
    const nextTier = Math.min(5, Math.max(1, (char.bleach_kidou_tier || 0) + 1))
    setKidouTier(nextTier)
    setKidouChoosing(null)
  }

  const handleSaveStats = async () => {
    if (!selectedCharacter) return
    if (selectedTraitIds.length < 5 || selectedTraitIds.length > 10) {
      alert('Selecione entre 5 e 10 tracos de personalidade.')
      return
    }
    
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
    const current = selectedCharacter.stands?.length || 0
    const maxSlots = 1 + (editStats.extra_stand_slots || 0)
    if (current >= maxSlots) {
      alert('Limite de Stands atingido para este personagem.')
      return
    }

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

  const handleBleachLevelUp = async () => {
    if (!selectedCharacter) return
    setKidouOffering(true)
    try {
      const offer = await api.bleachLevelUp(selectedCharacter.id, kidouTier)
      const existingOffers = selectedCharacter.bleach_spell_offers || []
      setSelectedCharacter({
        ...selectedCharacter,
        bleach_kidou_tier: Math.max(selectedCharacter.bleach_kidou_tier || 0, kidouTier),
        bleach_spell_offers: [offer, ...existingOffers.filter(o => o.id !== offer.id)],
      })
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setKidouOffering(false)
    }
  }

  const handleBleachChooseSpell = async (offerId, spellId) => {
    if (!selectedCharacter) return
    setKidouChoosing(`${offerId}:${spellId}`)
    try {
      const updated = await api.bleachChooseSpell(selectedCharacter.id, offerId, spellId)
      setSelectedCharacter(updated)
      setSelectedSkillIds((updated.skills || []).map(s => s.id))
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setKidouChoosing(null)
    }
  }

  const pendingIdeas = powerIdeas.filter(idea => idea.status === 'pending')

  const getTraitBonus = (char, statKey) => {
    const key = (statKey || '').toLowerCase()
    const traitsList = char?.personality_traits || []
    return traitsList.reduce((sum, trait) => {
      const traitKey = (trait.use_status || '').toLowerCase()
      if (traitKey === key) {
        const bonus = parseInt(trait.bonus, 10)
        return sum + (Number.isNaN(bonus) ? 0 : bonus)
      }
      return sum
    }, 0)
  }

  const getEffectiveStat = (char, statKey) => {
    const base = char?.[statKey] || 0
    return base + getTraitBonus(char, statKey)
  }

  const updateIdeaResponse = (ideaId, field, value) => {
    setIdeaResponses(prev => ({
      ...prev,
      [ideaId]: {
        ...(prev[ideaId] || {}),
        [field]: value,
      },
    }))
  }

  const updateSkillIdeaResponse = (ideaId, field, value) => {
    setSkillIdeaResponses(prev => ({
      ...prev,
      [ideaId]: {
        ...(prev[ideaId] || {}),
        [field]: value,
      },
    }))
  }

  const getIdeaValue = (ideaId, field, fallback = '') => {
    if (ideaResponses[ideaId] && ideaResponses[ideaId][field] !== undefined) {
      return ideaResponses[ideaId][field]
    }
    return fallback
  }

  const handleApproveIdea = async (idea) => {
    try {
      if (idea.idea_type === 'stand') {
        const data = {
          destructive_power: getIdeaValue(idea.id, 'destructive_power', 'C'),
          speed: getIdeaValue(idea.id, 'speed', 'C'),
          range_stat: getIdeaValue(idea.id, 'range_stat', 'C'),
          stamina: getIdeaValue(idea.id, 'stamina', 'C'),
          precision: getIdeaValue(idea.id, 'precision', 'C'),
          development_potential: getIdeaValue(idea.id, 'development_potential', 'C'),
        }
        await api.approvePowerIdea(idea.id, data)
      } else if (idea.idea_type === 'zanpakuto') {
        const data = {
          shikai_command: getIdeaValue(idea.id, 'shikai_command', '????????'),
          bankai_name: getIdeaValue(idea.id, 'bankai_name', '????????'),
        }
        await api.approvePowerIdea(idea.id, data)
      } else {
        const data = {
          technique_type: getIdeaValue(idea.id, 'technique_type', idea.technique_type || ''),
        }
        await api.approvePowerIdea(idea.id, data)
      }
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRejectIdea = async (idea) => {
    const reason = prompt('Motivo da recusa (opcional):', '') || ''
    try {
      await api.rejectPowerIdea(idea.id, reason)
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    }
  }

  const pendingSkillIdeas = (skillIdeas || []).filter(idea => idea.status === 'pending')
  const bleachSpells = selectedCharacter?.bleach_spells || []
  const bleachOffers = selectedCharacter?.bleach_spell_offers || []
  const openBleachOffers = bleachOffers.filter(offer => offer.is_open)
  const closedBleachOffers = bleachOffers.filter(offer => !offer.is_open)

  const getSkillIdeaValue = (ideaId, field, fallback = '') => {
    if (skillIdeaResponses[ideaId] && skillIdeaResponses[ideaId][field] !== undefined) {
      return skillIdeaResponses[ideaId][field]
    }
    return fallback
  }

  const handleApproveSkillIdea = async (idea) => {
    try {
      const mastery = parseInt(getSkillIdeaValue(idea.id, 'mastery', '0'), 10)
      await api.approveSkillIdea(idea.id, { mastery: Number.isNaN(mastery) ? 0 : mastery })
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRejectSkillIdea = async (idea) => {
    const reason = prompt('Motivo da recusa (opcional):', '') || ''
    try {
      await api.rejectSkillIdea(idea.id, reason)
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="party-panel">
      <h3>👥 Party ({party.length} jogadores)</h3>

      {pendingIdeas.length > 0 && (
        <div className="card mb-3">
          <h4 className="text-sm mb-3">Ideias Pendentes</h4>
          <div className="list">
            {pendingIdeas.map(idea => (
              <div key={idea.id} className="list-item idea-item">
                <div className="idea-details">
                  <strong>{idea.name}</strong>
                  <div className="text-xs text-muted">
                    {idea.idea_type} • {idea.character_name || 'Personagem'}
                    {idea.submitted_by_username ? ` • @${idea.submitted_by_username}` : ''}
                  </div>
                  {idea.description && (
                    <div className="text-xs text-muted">{idea.description}</div>
                  )}
                  {idea.notes && (
                    <div className="text-xs text-muted">{idea.notes}</div>
                  )}
                </div>
                <div className="idea-actions">
                  {idea.idea_type === 'stand' && (
                    <div className="idea-stand-stats">
                      {[
                        ['destructive_power', 'Poder'],
                        ['speed', 'Vel'],
                        ['range_stat', 'Alc'],
                        ['stamina', 'Pers'],
                        ['precision', 'Prec'],
                        ['development_potential', 'Pot'],
                      ].map(([field, label]) => (
                        <label key={field} className="text-xs">
                          {label}
                          <select
                            className="input"
                            style={{ width: 60 }}
                            value={getIdeaValue(idea.id, field, 'C')}
                            onChange={e => updateIdeaResponse(idea.id, field, e.target.value)}
                          >
                            {['F', 'E', 'D', 'C', 'B', 'A', 'S'].map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                  {idea.idea_type === 'zanpakuto' && (
                    <div className="idea-zanpakuto">
                      <input
                        type="text"
                        className="input"
                        placeholder="Shikai"
                        value={getIdeaValue(idea.id, 'shikai_command', '????????')}
                        onChange={e => updateIdeaResponse(idea.id, 'shikai_command', e.target.value)}
                        style={{ width: 120 }}
                      />
                      <input
                        type="text"
                        className="input"
                        placeholder="Bankai"
                        value={getIdeaValue(idea.id, 'bankai_name', '????????')}
                        onChange={e => updateIdeaResponse(idea.id, 'bankai_name', e.target.value)}
                        style={{ width: 120 }}
                      />
                    </div>
                  )}
                  {idea.idea_type === 'cursed' && (
                    <input
                      type="text"
                      className="input"
                      placeholder="Tipo da técnica"
                      value={getIdeaValue(idea.id, 'technique_type', idea.technique_type || '')}
                      onChange={e => updateIdeaResponse(idea.id, 'technique_type', e.target.value)}
                      style={{ width: 160 }}
                    />
                  )}
                  <button className="btn btn-sm btn-primary" onClick={() => handleApproveIdea(idea)}>
                    Aprovar
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleRejectIdea(idea)}>
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingSkillIdeas.length > 0 && (
        <div className="card mb-3">
          <h4 className="text-sm mb-3">Ideias de Skills Pendentes</h4>
          <div className="list">
            {pendingSkillIdeas.map(idea => (
              <div key={idea.id} className="list-item idea-item">
                <div className="idea-details">
                  <strong>{idea.name}</strong>
                  <div className="text-xs text-muted">
                    {idea.character_name || 'Personagem'}
                    {idea.submitted_by_username ? ` • @${idea.submitted_by_username}` : ''}
                  </div>
                  {idea.description && (
                    <div className="text-xs text-muted">{idea.description}</div>
                  )}
                </div>
                <div className="idea-actions">
                  <input
                    type="number"
                    className="input"
                    style={{ width: 100 }}
                    min="0"
                    placeholder="Maestria"
                    value={getSkillIdeaValue(idea.id, 'mastery', '0')}
                    onChange={e => updateSkillIdeaResponse(idea.id, 'mastery', e.target.value)}
                  />
                  <button className="btn btn-sm btn-primary" onClick={() => handleApproveSkillIdea(idea)}>
                    Aprovar
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleRejectSkillIdea(idea)}>
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
                    <span className={`stat-val ${getEffectiveStat(char, stat.key) >= 0 ? 'positive' : 'negative'}`}>
                      {getEffectiveStat(char, stat.key) >= 0 ? '+' : ''}{getEffectiveStat(char, stat.key)}
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
          <div className="modal character-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Editar {selectedCharacter.name}</h3>
              <button 
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedCharacter(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body character-modal-body">
              <div className="character-modal-grid">
                <section className="character-modal-section">
                  <h4 className="section-title">Atributos</h4>
                  <div className="stats-editor compact">
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

                  <div className="character-modal-row mt-3">
                    <div className="form-group">
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
                </section>

                <section className="character-modal-section">
                  <h4 className="section-title">Skills & Traços</h4>
                  {skills?.length > 0 ? (
                    <div className="form-group">
                      <label className="label">Perícias</label>
                      <div className="list compact-list scroll-box">
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
                  ) : (
                    <p className="text-xs text-muted">Nenhuma perícia disponível.</p>
                  )}

                  {traits.length > 0 && (
                    <div className="form-group mt-3">
                      <label className="label">Traços (min 5, max 10)</label>
                      <div className="list compact-list scroll-box">
                        {traits.map(trait => {
                          const checked = selectedTraitIds.includes(trait.id)
                          const disabled = !checked && selectedTraitIds.length >= 10
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
                              <span className="ml-2">{trait.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </section>

                {campaign?.campaign_type === 'jojo' && (
                  <section className="character-modal-section full">
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
                    <div className="form-group mt-2">
                      <label className="label">Slots extras de Stand</label>
                      <input
                        type="number"
                        className="input"
                        min="0"
                        value={editStats.extra_stand_slots}
                        onChange={e => setEditStats(prev => ({
                          ...prev,
                          extra_stand_slots: parseInt(e.target.value) || 0
                        }))}
                      />
                      <p className="text-xs text-muted mt-1">
                        1 permite um segundo Stand.
                      </p>
                    </div>
                    {selectedCharacter?.stands?.length > 0 && (
                      <p className="text-xs text-muted mt-2">
                        Stands definidos: {selectedCharacter.stands.map(s => s.name).join(', ')}
                      </p>
                    )}
                    {editStats.stand_unlocked ? (
                      <>
                        {((selectedCharacter?.stands?.length || 0) < (1 + (editStats.extra_stand_slots || 0))) ? (
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
                            Limite de Stands atingido.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted mt-2">
                        Libere o Stand para definir.
                      </p>
                    )}
                  </section>
                )}

                {campaign?.campaign_type === 'jjk' && (
                  <section className="character-modal-section full">
                    <label className="label">Tecnica Inata</label>
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={editStats.cursed_energy_unlocked}
                        onChange={e => setEditStats(prev => ({
                          ...prev,
                          cursed_energy_unlocked: e.target.checked
                        }))}
                      />
                      <span>Tecnica liberada</span>
                    </label>
                    <div className="form-group mt-2">
                      <label className="label">Slots extras de Técnica</label>
                      <input
                        type="number"
                        className="input"
                        min="0"
                        value={editStats.extra_cursed_technique_slots}
                        onChange={e => setEditStats(prev => ({
                          ...prev,
                          extra_cursed_technique_slots: parseInt(e.target.value) || 0
                        }))}
                      />
                      <p className="text-xs text-muted mt-1">
                        1 permite uma segunda técnica.
                      </p>
                    </div>
                  </section>
                )}

                {campaign?.campaign_type === 'bleach' && (
                  <section className="character-modal-section full">
                    <label className="label">Zanpakutou</label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editStats.zanpakuto_unlocked}
                          onChange={e => setEditStats(prev => ({
                            ...prev,
                            zanpakuto_unlocked: e.target.checked,
                            shikai_unlocked: e.target.checked ? prev.shikai_unlocked : false,
                            bankai_unlocked: e.target.checked ? prev.bankai_unlocked : false,
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
                            zanpakuto_unlocked: e.target.checked ? true : prev.zanpakuto_unlocked,
                            shikai_unlocked: e.target.checked,
                            bankai_unlocked: e.target.checked ? prev.bankai_unlocked : false,
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
                            zanpakuto_unlocked: e.target.checked ? true : prev.zanpakuto_unlocked,
                            shikai_unlocked: e.target.checked ? true : prev.shikai_unlocked,
                            bankai_unlocked: e.target.checked,
                          }))}
                        />
                        <span>Bankai liberada</span>
                      </label>
                    </div>
                    <div className="form-group mt-2">
                      <label className="label">Slots extras de Zanpakutou</label>
                      <input
                        type="number"
                        className="input"
                        min="0"
                        value={editStats.extra_zanpakuto_slots}
                        onChange={e => setEditStats(prev => ({
                          ...prev,
                          extra_zanpakuto_slots: parseInt(e.target.value) || 0
                        }))}
                      />
                      <p className="text-xs text-muted mt-1">
                        1 permite uma segunda Zanpakutou.
                      </p>
                    </div>

                    <div className="form-group mt-3 kidou-section">
                      <label className="label">Kidou (Hadou e Bakudou)</label>
                      <div className="kidou-summary">
                        <span className="badge">
                          Tier atual: {selectedCharacter.bleach_kidou_tier || 0}
                        </span>
                        <span className="text-xs text-muted">
                          Libere um tier para gerar 3 opções aleatórias.
                        </span>
                      </div>
                      <div className="kidou-controls">
                        <div className="kidou-tier">
                          <label className="label">Liberar Tier</label>
                          <select
                            className="input"
                            value={kidouTier}
                            onChange={e => setKidouTier(parseInt(e.target.value) || 1)}
                          >
                            {[1, 2, 3, 4, 5].map(tier => (
                              <option key={tier} value={tier}>Tier {tier}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={handleBleachLevelUp}
                          disabled={kidouOffering}
                        >
                          {kidouOffering ? 'Liberando...' : 'Liberar 3 opções'}
                        </button>
                      </div>

                      {openBleachOffers.length > 0 && (
                        <div className="kidou-offers mt-3">
                          {openBleachOffers.map(offer => (
                            <div key={offer.id} className="card kidou-offer">
                              <div className="kidou-offer-header">
                                <strong>Oferta Tier {offer.tier}</strong>
                                <span className="text-xs text-muted">Escolha 1</span>
                              </div>
                              <div className="kidou-options">
                                {offer.options.map(option => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    className="kidou-option"
                                    onClick={() => handleBleachChooseSpell(offer.id, option.id)}
                                    disabled={kidouChoosing === `${offer.id}:${option.id}`}
                                  >
                                    <div className="kidou-option-title">{option.name}</div>
                                    <div className="text-xs text-muted">
                                      {option.spell_type} {option.number || ''} • Tier {option.tier} • PA {option.pa_cost}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {bleachSpells.length > 0 && (
                        <div className="kidou-list mt-3">
                          <h4 className="text-sm mb-2">Kidou aprendidos</h4>
                          <div className="list">
                            {bleachSpells.map(link => (
                              <div key={link.id} className="list-item">
                                <div>
                                  <strong>{link.spell?.name}</strong>
                                  <div className="text-xs text-muted">
                                    {link.spell?.spell_type} {link.spell?.number || ''} • Tier {link.spell?.tier} • PA {link.spell?.pa_cost}
                                  </div>
                                </div>
                                <span className="badge">Maestria {link.mastery}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {closedBleachOffers.length > 0 && (
                        <div className="kidou-history mt-3">
                          <h4 className="text-sm mb-2">Histórico de Ofertas</h4>
                          <div className="list">
                            {closedBleachOffers.slice(0, 3).map(offer => (
                              <div key={offer.id} className="list-item">
                                <div>
                                  <strong>Tier {offer.tier}</strong>
                                  <div className="text-xs text-muted">
                                    Escolhido: {offer.chosen_spell?.name || 'N/A'}
                                  </div>
                                </div>
                                <span className="badge">{offer.is_open ? 'Aberta' : 'Fechada'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                <section className="character-modal-section full">
                  <details className="character-modal-collapsible">
                    <summary>Notas</summary>
                    <div className="character-modal-notes">
                      <NotesPanel character={selectedCharacter} isGameMaster />
                    </div>
                  </details>
                </section>

                <section className="character-modal-section full">
                  <h4 className="text-sm mb-2">Ações do Jogador</h4>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-secondary w-full"
                      onClick={() => handleRemovePlayer(selectedCharacter)}
                      disabled={removingId === selectedCharacter.id || banningId === selectedCharacter.id}
                    >
                      {removingId === selectedCharacter.id ? 'Removendo...' : 'Remover'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger w-full"
                      onClick={() => handleBanPlayer(selectedCharacter)}
                      disabled={removingId === selectedCharacter.id || banningId === selectedCharacter.id}
                    >
                      {banningId === selectedCharacter.id ? 'Banindo...' : 'Banir'}
                    </button>
                  </div>
                </section>
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
