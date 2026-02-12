import { useState, useEffect } from 'react'
import * as api from '../api'
import './CharacterSheet.css'

export default function CharacterSheet({ character, campaign, isGameMaster, powerIdeas = [], onUpdate }) {
  if (!character) {
    return <div className="text-muted">Nenhum personagem selecionado.</div>
  }

  const [standName, setStandName] = useState('')
  const [standType, setStandType] = useState('')
  const [standDescription, setStandDescription] = useState('')
  const [standNotes, setStandNotes] = useState('')
  const [creatingStand, setCreatingStand] = useState(false)
  const [techniqueName, setTechniqueName] = useState('')
  const [techniqueType, setTechniqueType] = useState('')
  const [techniqueDescription, setTechniqueDescription] = useState('')
  const [creatingTechnique, setCreatingTechnique] = useState(false)
  const [zanpakutoName, setZanpakutoName] = useState('')
  const [zanpakutoDescription, setZanpakutoDescription] = useState('')
  const [zanpakutoNotes, setZanpakutoNotes] = useState('')
  const [creatingZanpakuto, setCreatingZanpakuto] = useState(false)
  const [choosingKidou, setChoosingKidou] = useState(null)

  useEffect(() => {
    setStandName('')
    setStandType('')
    setStandDescription('')
    setStandNotes('')
    setCreatingStand(false)
    setTechniqueName('')
    setTechniqueType('')
    setTechniqueDescription('')
    setCreatingTechnique(false)
    setZanpakutoName('')
    setZanpakutoDescription('')
    setZanpakutoNotes('')
    setCreatingZanpakuto(false)
    setChoosingKidou(null)
  }, [character?.id])

  const pendingIdeas = powerIdeas.filter(
    idea => idea.character === character.id && idea.status === 'pending'
  )
  const pendingStandIdeas = pendingIdeas.filter(idea => idea.idea_type === 'stand')
  const pendingZanpakutoIdeas = pendingIdeas.filter(idea => idea.idea_type === 'zanpakuto')
  const pendingCursedIdeas = pendingIdeas.filter(idea => idea.idea_type === 'cursed')

  const stands = character.stands || []
  const zanpakutos = character.zanpakutos || []
  const cursedTechniques = character.cursed_techniques || []
  const bleachSpells = character.bleach_spells || []
  const bleachOffers = character.bleach_spell_offers || []

  const standSlots = 1 + (character.extra_stand_slots || 0)
  const zanpakutoSlots = 1 + (character.extra_zanpakuto_slots || 0)
  const cursedSlots = 1 + (character.extra_cursed_technique_slots || 0)

  const canCreateStand = (stands.length + pendingStandIdeas.length) < standSlots
  const canCreateZanpakuto = (zanpakutos.length + pendingZanpakutoIdeas.length) < zanpakutoSlots
  const canCreateCursed = (cursedTechniques.length + pendingCursedIdeas.length) < cursedSlots

  const handleCreateStand = async (e) => {
    e.preventDefault()
    if (!standName.trim()) return
    setCreatingStand(true)
    try {
      await api.createPowerIdea({
        campaign: character.campaign,
        character: character.id,
        idea_type: 'stand',
        name: standName,
        stand_type: standType,
        description: standDescription,
        notes: standNotes,
      })
      setStandName('')
      setStandType('')
      setStandDescription('')
      setStandNotes('')
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingStand(false)
    }
  }

  const handleCreateTechnique = async (e) => {
    e.preventDefault()
    if (!techniqueName.trim()) return
    setCreatingTechnique(true)
    try {
      await api.createPowerIdea({
        campaign: character.campaign,
        character: character.id,
        idea_type: 'cursed',
        name: techniqueName,
        technique_type: techniqueType,
        description: techniqueDescription,
      })
      setTechniqueName('')
      setTechniqueType('')
      setTechniqueDescription('')
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingTechnique(false)
    }
  }

  const handleCreateZanpakuto = async (e) => {
    e.preventDefault()
    if (!zanpakutoName.trim()) return
    setCreatingZanpakuto(true)
    try {
      await api.createPowerIdea({
        campaign: character.campaign,
        character: character.id,
        idea_type: 'zanpakuto',
        name: zanpakutoName,
        description: zanpakutoDescription,
        notes: zanpakutoNotes,
      })
      setZanpakutoName('')
      setZanpakutoDescription('')
      setZanpakutoNotes('')
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingZanpakuto(false)
    }
  }

  const handleChooseBleachSpell = async (offerId, spellId) => {
    setChoosingKidou(`${offerId}:${spellId}`)
    try {
      await api.bleachChooseSpell(character.id, offerId, spellId)
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setChoosingKidou(null)
    }
  }

  const getTypeLabel = () => {
    switch (campaign?.campaign_type) {
      case 'jojo': return 'Stand'
      case 'jjk': return 'Técnica Amaldiçoada'
      case 'bleach': return 'Zanpakutou'
      default: return 'Habilidade Especial'
    }
  }

  const imageUrl = api.mediaUrl(character?.image)

  return (
    <div className="character-sheet">
      {/* Header com imagem e nome */}
      <div className="sheet-header">
        <div className="character-avatar">
          {imageUrl ? (
            <img src={imageUrl} alt={character.name} />
          ) : (
            <div className="avatar-placeholder">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="character-basic">
          <h2>{character.name}</h2>
          {character.role && (
            <span className="character-role">{character.role}</span>
          )}
          {character.hierarchy && (
            <span className="character-hierarchy text-muted text-sm">
              {character.hierarchy}
            </span>
          )}
        </div>
      </div>

      {/* Descrição */}
      {character.description && (
        <div className="sheet-section">
          <p className="character-description">{character.description}</p>
        </div>
      )}

      {/* Status */}
      {character.status && (
        <div className="status-badge">
          Status: <strong>{character.status}</strong>
        </div>
      )}

      {/* Abilities */}
      {character.abilities?.length > 0 && (
        <div className="sheet-section">
          <h4 className="section-title">Habilidades</h4>
          <div className="abilities-list">
            {character.abilities.map(ability => (
              <div key={ability.id} className="ability-item">
                <span className="ability-name">{ability.name}</span>
                <span className="ability-description text-muted text-xs">
                  {ability.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personality Traits */}
      {character.personality_traits?.length > 0 && (
        <div className="sheet-section">
          <h4 className="section-title">Traços de Personalidade</h4>
          <div className="traits-list">
            {character.personality_traits.map(trait => (
              <span key={trait.id} className="trait-badge">
                {trait.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Advantages */}
      {character.advantages?.length > 0 && (
        <div className="sheet-section">
          <h4 className="section-title">Vantagens</h4>
          <div className="advantages-list">
            {character.advantages.map(adv => (
              <span key={adv.id} className="advantage-badge">
                {adv.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Poderes Especiais baseados no tipo de campanha */}
      {campaign?.campaign_type === 'jojo' && (
        <div className="sheet-section special-power">
          <h4 className="section-title">⭐ Stands</h4>
          {!character.stand_unlocked && (
            <p className="text-sm text-muted">
              Stand selado. Aguardando liberação do mestre.
            </p>
          )}
          {stands.length > 0 ? (
            <div className="mt-2">
              {stands.map((stand, index) => (
                <div key={stand.id || index} className="technique-item">
                  <strong>Stand {stand.name}</strong>
                  {character.stand_unlocked ? (
                    <>
                      <p className="text-sm text-muted">{stand.description}</p>
                      <div className="stand-stats">
                        <StandStat label="Poder" value={stand.destructive_power} />
                        <StandStat label="Velocidade" value={stand.speed} />
                        <StandStat label="Alcance" value={stand.range_stat} />
                        <StandStat label="Persistência" value={stand.stamina} />
                        <StandStat label="Precisão" value={stand.precision} />
                        <StandStat label="Potencial" value={stand.development_potential} />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted">Selado.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhum Stand definido ainda.</p>
          )}
          {pendingStandIdeas.length > 0 && (
            <div className="text-sm text-muted mt-2">
              Ideias pendentes: <strong>{pendingStandIdeas.map(idea => idea.name).join(', ')}</strong>
            </div>
          )}
          {canCreateStand ? (
            <form onSubmit={handleCreateStand} className="card mt-3">
              <div className="form-group">
                <label className="label">Nome do Stand</label>
                <input
                  type="text"
                  className="input"
                  value={standName}
                  onChange={e => setStandName(e.target.value)}
                  placeholder="Ex: Star Platinum"
                />
              </div>
              <div className="form-group">
                <label className="label">Tipo / Classe</label>
                <input
                  type="text"
                  className="input"
                  value={standType}
                  onChange={e => setStandType(e.target.value)}
                  placeholder="Ex: Close-range"
                />
              </div>
              <div className="form-group">
                <label className="label">Descrição / Ideia</label>
                <textarea
                  className="textarea input"
                  value={standDescription}
                  onChange={e => setStandDescription(e.target.value)}
                  placeholder="Descreva a ideia e poderes..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="label">Poderes / Observações</label>
                <textarea
                  className="textarea input"
                  value={standNotes}
                  onChange={e => setStandNotes(e.target.value)}
                  placeholder="Detalhe os poderes do Stand..."
                  rows={3}
                />
              </div>
              <button className="btn btn-primary btn-sm" disabled={creatingStand}>
                {creatingStand ? 'Enviando...' : 'Enviar Ideia'}
              </button>
              {!character.stand_unlocked && (
                <p className="text-xs text-muted mt-2">
                  A ideia pode ser enviada agora, mas ficará selada até o mestre liberar.
                </p>
              )}
            </form>
          ) : (
            <p className="text-xs text-muted mt-2">
              Limite de Stands atingido. Peça ao mestre para liberar outro.
            </p>
          )}
        </div>
      )}

      {campaign?.campaign_type === 'jjk' && (
        <div className="sheet-section special-power">
          <h4 className="section-title">👁️ Técnica Amaldiçoada</h4>
          {!character.cursed_energy_unlocked && (
            <p className="text-sm text-muted">
              Técnica inata selada. Aguardando liberação do mestre.
            </p>
          )}
          {cursedTechniques.length > 0 && (
            <div className="mt-3">
              {cursedTechniques.map(tech => (
                <div key={tech.id} className="technique-item">
                  <strong>Técnica Amaldiçoada {tech.name}</strong>
                  {!character.cursed_energy_unlocked && (
                    <p className="text-xs text-muted">Selada.</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <>
            {pendingCursedIdeas.length > 0 && (
              <div className="text-sm text-muted mt-3">
                Ideias pendentes: <strong>{pendingCursedIdeas.map(idea => idea.name).join(', ')}</strong>.
              </div>
            )}
            {canCreateCursed ? (
              <form onSubmit={handleCreateTechnique} className="card mt-3">
                <div className="form-group">
                  <label className="label">Nome da Técnica</label>
                  <input
                    type="text"
                    className="input"
                    value={techniqueName}
                    onChange={e => setTechniqueName(e.target.value)}
                    placeholder="Ex: Técnica Inata"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Tipo da Técnica</label>
                  <input
                    type="text"
                    className="input"
                    value={techniqueType}
                    onChange={e => setTechniqueType(e.target.value)}
                    placeholder="Ex: Inata, Herdada..."
                  />
                </div>
                <div className="form-group">
                  <label className="label">Descrição</label>
                  <textarea
                    className="textarea input"
                    value={techniqueDescription}
                    onChange={e => setTechniqueDescription(e.target.value)}
                    placeholder="Descreva a técnica..."
                    rows={3}
                  />
                </div>
                <button className="btn btn-primary btn-sm" disabled={creatingTechnique}>
                  {creatingTechnique ? 'Enviando...' : 'Enviar Ideia'}
                </button>
                {!character.cursed_energy_unlocked && (
                  <p className="text-xs text-muted mt-2">
                    A ideia pode ser enviada agora, mas ficará selada até o mestre liberar.
                  </p>
                )}
              </form>
            ) : (
              <p className="text-xs text-muted mt-2">
                Limite de Técnicas Amaldiçoadas atingido. Peça ao mestre para liberar outra.
              </p>
            )}
          </>
        </div>
      )}

      {campaign?.campaign_type === 'bleach' && (
        <div className="sheet-section special-power">
          <h4 className="section-title">⚔️ Zanpakutou</h4>
          {!character.zanpakuto_unlocked && (
            <p className="text-sm text-muted">
              Zanpakutou selada. Aguardando liberação do mestre.
            </p>
          )}
          <>
            {zanpakutos.length > 0 ? (
              <div className="mt-2">
                {zanpakutos.map((zanpakuto, index) => (
                  <div key={zanpakuto.id || index} className="technique-item">
                    <strong>⚔️ {zanpakuto.name}</strong>
                    {character.zanpakuto_unlocked ? (
                      <>
                        <p className="text-sm text-muted">{zanpakuto.sealed_form}</p>
                        {zanpakuto.shikai_command && (
                          <div className="zanpakuto-form">
                            <strong>Shikai:</strong> "{character.shikai_unlocked ? zanpakuto.shikai_command : '????????'}"
                            {character.shikai_unlocked && zanpakuto.shikai_description && (
                              <p className="text-sm">{zanpakuto.shikai_description}</p>
                            )}
                            {character.shikai_unlocked && zanpakuto.shikai_abilities?.length > 0 && (
                              <div className="zanpakuto-abilities">
                                <div className="text-xs text-muted mb-1">Habilidades do Shikai</div>
                                <div className="abilities-list">
                                  {zanpakuto.shikai_abilities.map(ability => (
                                    <div key={ability.id} className="ability-item">
                                      <span className="ability-name">{ability.name}</span>
                                      {ability.description && (
                                        <span className="ability-description text-muted text-xs">
                                          {ability.description}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {zanpakuto.bankai_name && (
                          <div className="zanpakuto-form">
                            <strong>Bankai:</strong> {character.bankai_unlocked ? zanpakuto.bankai_name : '????????'}
                            {character.bankai_unlocked && zanpakuto.bankai_description && (
                              <p className="text-sm">{zanpakuto.bankai_description}</p>
                            )}
                            {character.bankai_unlocked && zanpakuto.bankai_abilities?.length > 0 && (
                              <div className="zanpakuto-abilities">
                                <div className="text-xs text-muted mb-1">Habilidades do Bankai</div>
                                <div className="abilities-list">
                                  {zanpakuto.bankai_abilities.map(ability => (
                                    <div key={ability.id} className="ability-item">
                                      <span className="ability-name">{ability.name}</span>
                                      {ability.description && (
                                        <span className="ability-description text-muted text-xs">
                                          {ability.description}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted">A Zanpakutou esta selada.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nenhuma Zanpakutou definida ainda.</p>
            )}

            {pendingZanpakutoIdeas.length > 0 && (
              <p className="text-sm text-muted mt-2">
                Ideias pendentes: <strong>{pendingZanpakutoIdeas.map(idea => idea.name).join(', ')}</strong>
              </p>
            )}

            {canCreateZanpakuto ? (
              <form onSubmit={handleCreateZanpakuto} className="card mt-3">
                <div className="form-group">
                  <label className="label">Nome da Zanpakutou</label>
                  <input
                    type="text"
                    className="input"
                    value={zanpakutoName}
                    onChange={e => setZanpakutoName(e.target.value)}
                    placeholder="Ex: Zangetsu"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Descrição / Forma Selada</label>
                  <textarea
                    className="textarea input"
                    value={zanpakutoDescription}
                    onChange={e => setZanpakutoDescription(e.target.value)}
                    placeholder="Descreva a Zanpakutou..."
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Observações</label>
                  <textarea
                    className="textarea input"
                    value={zanpakutoNotes}
                    onChange={e => setZanpakutoNotes(e.target.value)}
                    placeholder="Notas e ideias..."
                    rows={3}
                  />
                </div>
                <button className="btn btn-primary btn-sm" disabled={creatingZanpakuto}>
                  {creatingZanpakuto ? 'Enviando...' : 'Enviar Ideia'}
                </button>
                {!character.zanpakuto_unlocked && (
                  <p className="text-xs text-muted mt-2">
                    A ideia pode ser enviada agora, mas ficará selada até o mestre liberar.
                  </p>
                )}
              </form>
            ) : (
              <p className="text-xs text-muted mt-2">
                Limite de Zanpakutou atingido. Peça ao mestre para liberar outra.
              </p>
            )}

            <div className="mt-3 text-xs text-muted">
              {character.shikai_unlocked ? 'Shikai liberada' : 'Shikai não liberada'}
              {' • '}
              {character.bankai_unlocked ? 'Bankai liberada' : 'Bankai não liberada'}
            </div>
          </>
        </div>
      )}

      {campaign?.campaign_type === 'bleach' && (
        <div className="sheet-section special-power">
          <h4 className="section-title">✨ Kidou (Hadou e Bakudou)</h4>
          <div className="kidou-meta">
            <span className="badge">Tier liberado: {character.bleach_kidou_tier || 0}</span>
            {bleachOffers.length === 0 && (
              <span className="text-xs text-muted">Aguardando o mestre liberar novos kidou.</span>
            )}
          </div>

          {bleachOffers.length > 0 && (
            <div className="kidou-offers mt-3">
              {bleachOffers.map(offer => (
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
                        onClick={() => handleChooseBleachSpell(offer.id, option.id)}
                        disabled={choosingKidou === `${offer.id}:${option.id}`}
                      >
                        <div className="kidou-option-title">{option.name}</div>
                        <div className="text-xs text-muted">
                          {option.spell_type} {option.number || ''} • Tier {option.tier} • PA {option.pa_cost}
                        </div>
                        {option.effect && (
                          <div className="text-xs text-muted kidou-option-effect">
                            {option.effect}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {bleachSpells.length > 0 ? (
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
          ) : (
            <p className="text-xs text-muted mt-2">Nenhum Kidou aprendido ainda.</p>
          )}
        </div>
      )}
    </div>
  )
}

function StandStat({ label, value }) {
  if (!value) return null
  
  const getColor = (val) => {
    switch (val?.toUpperCase()) {
      case 'S': return '#22c55e'
      case 'A': return '#10b981'
      case 'B': return '#3b82f6'
      case 'C': return '#f59e0b'
      case 'D': return '#f97316'
      case 'E': return '#ef4444'
      case 'F': return '#b91c1c'
      default: return '#a0a0a0'
    }
  }
  
  return (
    <div className="stand-stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ color: getColor(value) }}>
        {value}
      </span>
    </div>
  )
}
