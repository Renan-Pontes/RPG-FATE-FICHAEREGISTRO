import { useState, useEffect } from 'react'
import * as api from '../api'
import './CharacterSheet.css'

export default function CharacterSheet({ character, campaign, isGameMaster, onUpdate }) {
  if (!character) {
    return <div className="text-muted">Nenhum personagem selecionado.</div>
  }

  const [standName, setStandName] = useState('')
  const [standType, setStandType] = useState('')
  const [standDescription, setStandDescription] = useState('')
  const [standNotes, setStandNotes] = useState('')
  const [creatingStand, setCreatingStand] = useState(false)

  useEffect(() => {
    setStandName('')
    setStandType('')
    setStandDescription('')
    setStandNotes('')
    setCreatingStand(false)
  }, [character?.id])

  const handleCreateStand = async (e) => {
    e.preventDefault()
    if (!standName.trim()) return
    setCreatingStand(true)
    try {
      await api.createStand({
        name: standName,
        stand_type: standType,
        description: standDescription,
        notes: standNotes,
        owner_character: character.id,
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

  const handleToggleRelease = async (nextShikai, nextBankai) => {
    try {
      await api.setRelease(character.id, {
        shikai_active: nextShikai,
        bankai_active: nextBankai,
      })
      onUpdate?.()
    } catch (err) {
      alert(err.message)
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

  return (
    <div className="character-sheet">
      {/* Header com imagem e nome */}
      <div className="sheet-header">
        <div className="character-avatar">
          {character.image ? (
            <img src={character.image} alt={character.name} />
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

      {/* Skills */}
      {character.skills?.length > 0 && (
        <div className="sheet-section">
          <h4 className="section-title">Perícias</h4>
          <div className="skills-list">
            {character.skills.map(skill => (
              <div key={skill.id} className="skill-item">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-description text-muted text-xs">
                  {skill.description}
                </span>
              </div>
            ))}
          </div>
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
      {campaign?.campaign_type === 'jojo' && character.stand && (
        <div className="sheet-section special-power">
          <h4 className="section-title">⭐ Stand: {character.stand.name}</h4>
          <p className="text-sm text-muted">{character.stand.description}</p>
          <div className="stand-stats">
            <StandStat label="Poder" value={character.stand.destructive_power} />
            <StandStat label="Velocidade" value={character.stand.speed} />
            <StandStat label="Alcance" value={character.stand.range_stat} />
            <StandStat label="Persistência" value={character.stand.stamina} />
            <StandStat label="Precisão" value={character.stand.precision} />
            <StandStat label="Potencial" value={character.stand.development_potential} />
          </div>
        </div>
      )}

      {campaign?.campaign_type === 'jojo' && !character.stand && (
        <div className="sheet-section special-power">
          <h4 className="section-title">⭐ Stand</h4>
          {!character.stand_unlocked ? (
            <p className="text-sm text-muted">Seu Stand ainda não foi liberado.</p>
          ) : (
            <form onSubmit={handleCreateStand} className="card">
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
                {creatingStand ? 'Criando...' : 'Criar Stand'}
              </button>
            </form>
          )}
        </div>
      )}

      {campaign?.campaign_type === 'jjk' && (
        <div className="sheet-section special-power">
          <h4 className="section-title">👁️ Energia Amaldiçoada</h4>
          {character.cursed_energy_unlocked ? (
            <div className="text-sm text-muted">
              Energia atual: <strong>{character.cursed_energy}</strong>
            </div>
          ) : (
            <p className="text-sm text-muted">Energia amaldiçoada ainda não foi liberada.</p>
          )}
          {character.cursed_techniques?.length > 0 && (
            <div className="mt-3">
              {character.cursed_techniques.map(tech => (
                <div key={tech.id} className="technique-item">
                  <strong>{tech.name}</strong>
                  <p className="text-sm text-muted">{tech.description}</p>
                  <span className="text-xs">Custo: {tech.cursed_energy_cost} EC</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {campaign?.campaign_type === 'bleach' && (
        <div className="sheet-section special-power">
          <h4 className="section-title">⚔️ Zanpakutou</h4>
          {!character.zanpakuto_unlocked ? (
            <p className="text-sm text-muted">Sua Zanpakutou ainda não foi liberada.</p>
          ) : (
            <>
              {character.zanpakuto ? (
                <>
                  <h4 className="section-title">⚔️ {character.zanpakuto.name}</h4>
                  <p className="text-sm text-muted">{character.zanpakuto.sealed_form}</p>
                  
                  {character.zanpakuto.shikai_command && (
                    <div className="zanpakuto-form">
                      <strong>Shikai:</strong> "{character.zanpakuto.shikai_command}"
                      <p className="text-sm">{character.zanpakuto.shikai_description}</p>
                    </div>
                  )}
                  
                  {character.zanpakuto.bankai_name && (
                    <div className="zanpakuto-form">
                      <strong>Bankai:</strong> {character.zanpakuto.bankai_name}
                      <p className="text-sm">{character.zanpakuto.bankai_description}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">A Zanpakutou ainda não foi definida pelo mestre.</p>
              )}

              <div className="mt-3">
                <div className="flex gap-2">
                  <button
                    className="btn btn-sm btn-secondary"
                    disabled={!character.shikai_unlocked}
                    onClick={() => handleToggleRelease(!character.shikai_active, character.bankai_active)}
                  >
                    {character.shikai_active ? 'Desativar Shikai' : 'Ativar Shikai'}
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    disabled={!character.bankai_unlocked}
                    onClick={() => handleToggleRelease(true, !character.bankai_active)}
                  >
                    {character.bankai_active ? 'Desativar Bankai' : 'Ativar Bankai'}
                  </button>
                </div>
                <div className="text-xs text-muted mt-2">
                  {character.shikai_unlocked ? 'Shikai liberada' : 'Shikai não liberada'}
                  {' • '}
                  {character.bankai_unlocked ? 'Bankai liberada' : 'Bankai não liberada'}
                </div>
              </div>
            </>
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
      case 'A': return '#10b981'
      case 'B': return '#3b82f6'
      case 'C': return '#f59e0b'
      case 'D': return '#f97316'
      case 'E': return '#ef4444'
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
