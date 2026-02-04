import { useState, useEffect, useRef } from 'react'
import * as api from '../api'
import './DiceRoller.css'

const DICE_VALUES = [-1, 0, 1]
const SPIN_DURATION = 2000 // 2 segundos de animação

export default function DiceRoller({ 
  character, 
  characters, 
  skills, 
  isGameMaster,
  onClose, 
  onComplete 
}) {
  const [selectedCharacter, setSelectedCharacter] = useState(character?.id || '')
  const [selectedSkill, setSelectedSkill] = useState('')
  const [description, setDescription] = useState('')
  const [useFatePoint, setUseFatePoint] = useState(false)
  
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState(null)
  const [diceResults, setDiceResults] = useState([null, null, null, null])
  const [spinningDice, setSpinningDice] = useState([false, false, false, false])

  const currentChar = characters?.find(c => c.id === parseInt(selectedCharacter))

  const handleRoll = async () => {
    if (!selectedCharacter) return
    
    setRolling(true)
    setResult(null)
    setDiceResults([null, null, null, null])
    
    // Iniciar animação de todos os dados
    setSpinningDice([true, true, true, true])
    
    try {
      // Fazer a rolagem no servidor
      const rollResult = await api.rollDice(
        parseInt(selectedCharacter),
        selectedSkill ? parseInt(selectedSkill) : null,
        description,
        useFatePoint
      )
      
      // Parar cada dado em sequência com delay
      const finalDice = [
        rollResult.dice_1,
        rollResult.dice_2,
        rollResult.dice_3,
        rollResult.dice_4,
      ]
      
      // Animação sequencial - cada dado para em um momento diferente
      for (let i = 0; i < 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 400 + (i * 300)))
        setDiceResults(prev => {
          const newResults = [...prev]
          newResults[i] = finalDice[i]
          return newResults
        })
        setSpinningDice(prev => {
          const newSpinning = [...prev]
          newSpinning[i] = false
          return newSpinning
        })
      }
      
      // Mostrar resultado total após todos os dados pararem
      await new Promise(resolve => setTimeout(resolve, 500))
      setResult(rollResult)
      
    } catch (err) {
      alert(err.message || 'Erro ao rolar dados')
    } finally {
      setRolling(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="dice-roller-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">🎲 Rolagem de Dados FATE</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {/* Seleção de personagem (se mestre) */}
          {isGameMaster && characters?.length > 0 && (
            <div className="form-group">
              <label className="label">Personagem</label>
              <select
                className="input"
                value={selectedCharacter}
                onChange={e => setSelectedCharacter(e.target.value)}
                disabled={rolling}
              >
                <option value="">Selecione...</option>
                {characters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.is_npc ? '(NPC)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Skill opcional */}
          {skills?.length > 0 && (
            <div className="form-group">
              <label className="label">Skill (opcional)</label>
              <select
                className="input"
                value={selectedSkill}
                onChange={e => setSelectedSkill(e.target.value)}
                disabled={rolling}
              >
                <option value="">Nenhuma skill</option>
                {skills.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (+{s.bonus})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Descrição */}
          <div className="form-group">
            <label className="label">Descrição da ação</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Atacar o inimigo, Convencer o guarda..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={rolling}
            />
          </div>

          {/* Usar Fate Point */}
          {currentChar && currentChar.fate_points > 0 && !result && (
            <label className="fate-point-toggle">
              <input
                type="checkbox"
                checked={useFatePoint}
                onChange={e => setUseFatePoint(e.target.checked)}
                disabled={rolling}
              />
              <span className="toggle-label">
                ✨ Mudar o Destino! 
                <span className="text-muted text-sm">
                  (Garante +4, usa 1 Fate Point)
                </span>
              </span>
              <span className="fate-count">{currentChar.fate_points} FP</span>
            </label>
          )}

          {/* Área dos Dados */}
          <div className="dice-area">
            <div className="dice-container">
              {[0, 1, 2, 3].map(index => (
                <DiceSlot
                  key={index}
                  spinning={spinningDice[index]}
                  value={diceResults[index]}
                  usedFate={useFatePoint && result}
                />
              ))}
            </div>
            
            {/* Resultado */}
            {result && (
              <div className="roll-result animate-slide-up">
                <div className="result-total">
                  <span className="result-label">Resultado dos Dados</span>
                  <span className={`result-value ${result.final_total >= 0 ? 'positive' : 'negative'}`}>
                    {result.final_total >= 0 ? '+' : ''}{result.final_total}
                  </span>
                </div>
                
                {useFatePoint && (
                  <div className="fate-used-badge">
                    ✨ Destino Alterado!
                  </div>
                )}
                
                {isGameMaster && (
                  <div className="master-info">
                    <span className="text-muted text-sm">Bônus oculto: +{result.hidden_bonus}</span>
                    <span className="total-hidden">
                      Total: <strong>{result.hidden_total}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          {!result ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleRoll}
                disabled={rolling || !selectedCharacter}
              >
                {rolling ? 'Rolando...' : '🎲 Rolar Dados'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => {
                setResult(null)
                setDiceResults([null, null, null, null])
                setUseFatePoint(false)
              }}>
                Rolar Novamente
              </button>
              <button className="btn btn-primary" onClick={() => {
                onComplete?.()
                onClose()
              }}>
                Concluir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente do dado individual com animação de roleta
function DiceSlot({ spinning, value, usedFate }) {
  const slotRef = useRef(null)
  const [displayValues, setDisplayValues] = useState([])
  
  // Gerar valores aleatórios para a animação
  useEffect(() => {
    if (spinning) {
      const values = []
      for (let i = 0; i < 30; i++) {
        values.push(DICE_VALUES[Math.floor(Math.random() * 3)])
      }
      setDisplayValues(values)
    }
  }, [spinning])

  const getValueDisplay = (val) => {
    if (val === null) return '?'
    if (val === -1) return '−'
    if (val === 0) return '0'
    if (val === 1) return '+'
    return val
  }

  const getValueClass = (val) => {
    if (val === null) return ''
    if (val === -1) return 'negative'
    if (val === 0) return 'neutral'
    if (val === 1) return 'positive'
    return ''
  }

  return (
    <div className={`dice-slot ${spinning ? 'spinning' : ''} ${usedFate ? 'fate-used' : ''}`}>
      <div className="dice-inner" ref={slotRef}>
        {spinning ? (
          <div className="dice-reel">
            {displayValues.map((v, i) => (
              <div key={i} className={`dice-value ${getValueClass(v)}`}>
                {getValueDisplay(v)}
              </div>
            ))}
          </div>
        ) : (
          <div className={`dice-value ${getValueClass(value)} ${value !== null ? 'final' : ''}`}>
            {getValueDisplay(value)}
          </div>
        )}
      </div>
    </div>
  )
}
