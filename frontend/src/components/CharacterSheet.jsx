import './CharacterSheet.css'

export default function CharacterSheet({ character, campaign, onUpdate }) {
  if (!character) {
    return <div className="text-muted">Nenhum personagem selecionado.</div>
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

      {campaign?.campaign_type === 'jjk' && character.cursed_techniques?.length > 0 && (
        <div className="sheet-section special-power">
          <h4 className="section-title">👁️ Técnicas Amaldiçoadas</h4>
          {character.cursed_techniques.map(tech => (
            <div key={tech.id} className="technique-item">
              <strong>{tech.name}</strong>
              <p className="text-sm text-muted">{tech.description}</p>
              <span className="text-xs">Custo: {tech.cursed_energy_cost} EC</span>
            </div>
          ))}
        </div>
      )}

      {campaign?.campaign_type === 'bleach' && character.zanpakuto && (
        <div className="sheet-section special-power">
          <h4 className="section-title">⚔️ Zanpakutou: {character.zanpakuto.name}</h4>
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
