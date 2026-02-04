import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../api'
import DiceRoller from '../components/DiceRoller'
import CharacterSheet from '../components/CharacterSheet'
import Inventory from '../components/Inventory'
import NotesPanel from '../components/NotesPanel'
import PartyPanel from '../components/PartyPanel'
import ProjectionArea from '../components/ProjectionArea'
import NotificationBell from '../components/NotificationBell'
import './CampaignPage.css'

const TABS = {
  player: ['sheet', 'inventory', 'notes', 'trade'],
  master: ['party', 'npcs', 'items', 'projection'],
}

export default function CampaignPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isGameMaster } = useAuth()
  
  const [campaign, setCampaign] = useState(null)
  const [myCharacter, setMyCharacter] = useState(null)
  const [party, setParty] = useState([])
  const [npcs, setNpcs] = useState([])
  const [items, setItems] = useState([])
  const [skills, setSkills] = useState([])
  const [notifications, setNotifications] = useState([])
  const [projection, setProjection] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(isGameMaster ? 'party' : 'sheet')
  const [showRoller, setShowRoller] = useState(false)

  // Load campaign data
  const loadData = useCallback(async () => {
    try {
      const [campaignData, partyData, skillsData] = await Promise.all([
        api.getCampaign(id),
        api.getParty(id),
        api.getSkills(id),
      ])
      
      setCampaign(campaignData)
      setParty(partyData)
      setSkills(skillsData)
      
      // Find my character
      if (!isGameMaster) {
        const mine = partyData.find(c => c.owner === user?.id)
        setMyCharacter(mine || null)
      }
      
      // Load master-only data
      if (isGameMaster) {
        const [npcsData, itemsData] = await Promise.all([
          api.getNPCs(id),
          api.getItems(id, null),
        ])
        setNpcs(npcsData)
        setItems(itemsData)
      }
      
      // Load projection
      const projData = await api.getProjection(id)
      setProjection(projData)
      
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id, isGameMaster, user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Polling every 3 seconds
  useEffect(() => {
    if (!campaign) return
    
    const interval = setInterval(async () => {
      try {
        const data = await api.pollCampaign(id)
        
        // Update projection
        if (data.projection) {
          setProjection(data.projection)
        }
        
        // Update notifications
        if (data.notifications?.length > 0) {
          setNotifications(prev => {
            const newIds = new Set(data.notifications.map(n => n.id))
            const filtered = prev.filter(n => !newIds.has(n.id))
            return [...data.notifications, ...filtered]
          })
        }
        
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [id, campaign])

  const handleRollComplete = () => {
    loadData()
    setShowRoller(false)
  }

  const tabs = isGameMaster ? TABS.master : TABS.player

  if (loading) {
    return (
      <div className="campaign-page">
        <div className="campaign-loading">Carregando campanha...</div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="campaign-page">
        <div className="campaign-loading">Campanha não encontrada.</div>
      </div>
    )
  }

  return (
    <div className="campaign-page">
      {/* Header */}
      <header className="campaign-header">
        <div className="header-left">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            ← Voltar
          </button>
          <div className="campaign-info">
            <h1>{campaign.name}</h1>
            <span className="campaign-type">{campaign.campaign_type}</span>
          </div>
        </div>
        <div className="header-right">
          <NotificationBell 
            notifications={notifications} 
            onClear={() => setNotifications([])}
          />
          {myCharacter && (
            <div className="fate-points-display">
              <span className="fate-label">Fate Points</span>
              <span className="fate-value">{myCharacter.fate_points}</span>
            </div>
          )}
          {(myCharacter || isGameMaster) && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowRoller(true)}
            >
              🎲 Rolar Dados
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="campaign-content">
        {/* Projection Area */}
        <ProjectionArea 
          projection={projection}
          campaign={campaign}
          isGameMaster={isGameMaster}
          onUpdate={loadData}
        />

        {/* Side Panel */}
        <div className="side-panel">
          <div className="tabs">
            {tabs.map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {getTabLabel(tab)}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {/* Player Tabs */}
            {activeTab === 'sheet' && myCharacter && (
              <CharacterSheet 
                character={myCharacter} 
                campaign={campaign}
                onUpdate={loadData}
              />
            )}
            {activeTab === 'sheet' && !myCharacter && !isGameMaster && (
              <CreateCharacterPrompt 
                campaignId={id} 
                onCreated={loadData}
              />
            )}
            {activeTab === 'inventory' && myCharacter && (
              <Inventory 
                character={myCharacter}
                party={party}
                onUpdate={loadData}
              />
            )}
            {activeTab === 'notes' && myCharacter && (
              <NotesPanel character={myCharacter} />
            )}
            {activeTab === 'trade' && (
              <TradePanel party={party} myCharacter={myCharacter} onUpdate={loadData} />
            )}

            {/* Master Tabs */}
            {activeTab === 'party' && isGameMaster && (
              <PartyPanel 
                party={party} 
                campaign={campaign}
                skills={skills}
                onUpdate={loadData}
              />
            )}
            {activeTab === 'npcs' && isGameMaster && (
              <NPCPanel 
                npcs={npcs} 
                campaign={campaign}
                onUpdate={loadData}
              />
            )}
            {activeTab === 'items' && isGameMaster && (
              <ItemsManagerPanel 
                items={items}
                party={[...party, ...npcs]}
                campaign={campaign}
                onUpdate={loadData}
              />
            )}
            {activeTab === 'projection' && isGameMaster && (
              <ProjectionPanel 
                campaign={campaign}
                onUpdate={loadData}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dice Roller Modal */}
      {showRoller && (
        <DiceRoller
          character={myCharacter || (isGameMaster ? party[0] : null)}
          characters={isGameMaster ? [...party, ...npcs] : [myCharacter]}
          skills={skills}
          isGameMaster={isGameMaster}
          onClose={() => setShowRoller(false)}
          onComplete={handleRollComplete}
        />
      )}
    </div>
  )
}

function getTabLabel(tab) {
  const labels = {
    sheet: '📋 Ficha',
    inventory: '🎒 Inventário',
    notes: '📝 Notas',
    trade: '🔄 Trocas',
    party: '👥 Party',
    npcs: '🎭 NPCs',
    items: '📦 Itens',
    projection: '🖼️ Projeção',
  }
  return labels[tab] || tab
}

// Componentes auxiliares inline (podem ser movidos para arquivos separados)

function CreateCharacterPrompt({ campaignId, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name) {
      setError('Informe o nome do personagem.')
      return
    }
    
    setCreating(true)
    try {
      await api.createCharacter({
        name,
        description,
        campaign: parseInt(campaignId),
      })
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="create-character-prompt">
      <h3>Criar Personagem</h3>
      <p className="text-muted text-sm mb-4">
        Você ainda não tem um personagem nesta campanha.
      </p>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleCreate}>
        <div className="form-group">
          <label className="label">Nome</label>
          <input
            type="text"
            className="input"
            placeholder="Nome do personagem"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Descrição</label>
          <textarea
            className="textarea input"
            placeholder="Breve descrição..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <button 
          type="submit" 
          className="btn btn-primary w-full"
          disabled={creating}
        >
          {creating ? 'Criando...' : 'Criar Personagem'}
        </button>
      </form>
    </div>
  )
}

function TradePanel({ party, myCharacter, onUpdate }) {
  if (!myCharacter) {
    return <div className="text-muted">Crie um personagem primeiro.</div>
  }

  const myItems = myCharacter.items || []
  const otherCharacters = party.filter(c => c.id !== myCharacter.id)

  const handleTransfer = async (itemId, toCharacterId) => {
    try {
      await api.transferItem(itemId, toCharacterId)
      onUpdate()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="trade-panel">
      <h3>Transferir Itens</h3>
      
      {myItems.length === 0 ? (
        <p className="text-muted text-sm">Você não tem itens para transferir.</p>
      ) : (
        <div className="list">
          {myItems.map(item => (
            <div key={item.id} className="list-item">
              <div>
                <strong>{item.name}</strong>
                <div className="text-xs text-muted">Qtd: {item.quantity}</div>
              </div>
              <select 
                className="input"
                style={{ width: 'auto' }}
                onChange={e => {
                  if (e.target.value) {
                    handleTransfer(item.id, parseInt(e.target.value))
                    e.target.value = ''
                  }
                }}
              >
                <option value="">Transferir para...</option>
                {otherCharacters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NPCPanel({ npcs, campaign, onUpdate }) {
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name) return
    
    setCreating(true)
    try {
      await api.createCharacter({
        name,
        description,
        campaign: campaign.id,
        is_npc: true,
      })
      setName('')
      setDescription('')
      setShowCreate(false)
      onUpdate()
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="npc-panel">
      <div className="flex justify-between items-center mb-4">
        <h3>NPCs</h3>
        <button 
          className="btn btn-sm btn-secondary"
          onClick={() => setShowCreate(!showCreate)}
        >
          + Novo NPC
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card mb-4">
          <div className="form-group">
            <input
              type="text"
              className="input"
              placeholder="Nome do NPC"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <textarea
              className="textarea input"
              placeholder="Descrição..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary btn-sm"
            disabled={creating}
          >
            Criar NPC
          </button>
        </form>
      )}

      <div className="list">
        {npcs.length === 0 ? (
          <p className="text-muted text-sm">Nenhum NPC criado.</p>
        ) : (
          npcs.map(npc => (
            <div key={npc.id} className="list-item">
              <div>
                <strong>{npc.name}</strong>
                <div className="text-xs text-muted">{npc.description}</div>
              </div>
              <span className="badge">NPC</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ItemsManagerPanel({ items, party, campaign, onUpdate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [itemType, setItemType] = useState('misc')
  const [ownerId, setOwnerId] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name || !ownerId) return
    
    setCreating(true)
    try {
      await api.createItem({
        name,
        description,
        item_type: itemType,
        owner_character: parseInt(ownerId),
      })
      setName('')
      setDescription('')
      setOwnerId('')
      onUpdate()
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="items-panel">
      <h3 className="mb-4">Gerenciar Itens</h3>
      
      <form onSubmit={handleCreate} className="card mb-4">
        <h4 className="text-sm mb-3">Criar Item</h4>
        <div className="grid grid-2 gap-2">
          <input
            type="text"
            className="input"
            placeholder="Nome"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <select
            className="input"
            value={itemType}
            onChange={e => setItemType(e.target.value)}
          >
            <option value="weapon">Arma</option>
            <option value="armor">Armadura</option>
            <option value="consumable">Consumível</option>
            <option value="accessory">Acessório</option>
            <option value="misc">Diversos</option>
          </select>
        </div>
        <textarea
          className="textarea input mt-2"
          placeholder="Descrição"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <select
          className="input mt-2"
          value={ownerId}
          onChange={e => setOwnerId(e.target.value)}
        >
          <option value="">Selecione o dono</option>
          {party.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} {c.is_npc ? '(NPC)' : ''}
            </option>
          ))}
        </select>
        <button 
          type="submit" 
          className="btn btn-primary btn-sm mt-3"
          disabled={creating || !name || !ownerId}
        >
          Criar Item
        </button>
      </form>

      <h4 className="text-sm mb-2">Itens na Campanha</h4>
      <div className="list">
        {items.length === 0 ? (
          <p className="text-muted text-sm">Nenhum item criado.</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="list-item">
              <div>
                <strong>{item.name}</strong>
                <div className="text-xs text-muted">
                  {item.item_type} • {item.owner_character_name}
                </div>
              </div>
              <span className="badge">{item.quantity}x</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ProjectionPanel({ campaign, onUpdate }) {
  const [title, setTitle] = useState(campaign.projection_title || '')
  const [image, setImage] = useState(null)
  const [updating, setUpdating] = useState(false)

  const handleUpdate = async (e) => {
    e.preventDefault()
    
    setUpdating(true)
    try {
      const formData = new FormData()
      formData.append('projection_title', title)
      if (image) {
        formData.append('projection_image', image)
      }
      
      await api.updateProjection(campaign.id, formData)
      onUpdate()
    } catch (err) {
      alert(err.message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="projection-panel">
      <h3 className="mb-4">Controle de Projeção</h3>
      <p className="text-muted text-sm mb-4">
        A imagem e título que você definir aqui serão mostrados para todos os jogadores.
      </p>
      
      <form onSubmit={handleUpdate}>
        <div className="form-group">
          <label className="label">Título / Legenda</label>
          <input
            type="text"
            className="input"
            placeholder="Ex: O vilão aparece..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Imagem</label>
          <input
            type="file"
            className="input"
            accept="image/*"
            onChange={e => setImage(e.target.files?.[0] || null)}
          />
        </div>
        <button 
          type="submit" 
          className="btn btn-primary w-full"
          disabled={updating}
        >
          {updating ? 'Atualizando...' : 'Atualizar Projeção'}
        </button>
      </form>
    </div>
  )
}
