import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../api'
import './CampaignsPage.css'

const CAMPAIGN_TYPES = [
  { value: 'jojo', label: 'JoJo Bizarre Adventure', icon: '⭐' },
  { value: 'jjk', label: 'Jujutsu Kaisen', icon: '👁️' },
  { value: 'bleach', label: 'Bleach', icon: '⚔️' },
  { value: 'generic', label: 'FATE Genérico', icon: '🎲' },
]

export default function CampaignsPage() {
  const navigate = useNavigate()
  const { user, logout, isGameMaster } = useAuth()
  
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [campaignType, setCampaignType] = useState('generic')
  const [era, setEra] = useState('')
  const [location, setLocation] = useState('')
  const [image, setImage] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const data = await api.getCampaigns()
      setCampaigns(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!name) {
      setError('Informe o nome da campanha.')
      return
    }
    
    setCreating(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('campaign_type', campaignType)
      formData.append('era_campaign', era)
      formData.append('location_campaign', location)
      if (image) {
        formData.append('image', image)
      }
      
      await api.createCampaign(formData)
      await loadCampaigns()
      
      // Reset form
      setName('')
      setDescription('')
      setCampaignType('generic')
      setEra('')
      setLocation('')
      setImage(null)
      setShowCreateModal(false)
    } catch (err) {
      setError(err.message || 'Falha ao criar campanha.')
    } finally {
      setCreating(false)
    }
  }

  const getCampaignTypeInfo = (type) => {
    return CAMPAIGN_TYPES.find(t => t.value === type) || CAMPAIGN_TYPES[3]
  }

  return (
    <div className="campaigns-page">
      <header className="campaigns-header">
        <div className="header-left">
          <h1 className="display">FATE FORGE</h1>
          <span className="header-tag">Campanhas</span>
        </div>
        <div className="header-right">
          <span className="user-info">
            {user?.username}
            {isGameMaster && <span className="badge badge-accent ml-2">Mestre</span>}
          </span>
          <button className="btn btn-ghost" onClick={logout}>Sair</button>
        </div>
      </header>

      <main className="campaigns-main">
        <div className="campaigns-toolbar">
          <h2>Suas Campanhas</h2>
          {isGameMaster && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              + Nova Campanha
            </button>
          )}
        </div>

        {loading ? (
          <div className="campaigns-loading">
            <div className="text-muted">Carregando campanhas...</div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="campaigns-empty card">
            <div className="empty-icon">🎲</div>
            <h3>Nenhuma campanha</h3>
            <p className="text-muted">
              {isGameMaster 
                ? 'Crie sua primeira campanha para começar.'
                : 'Aguarde o mestre criar uma campanha e adicionar você.'}
            </p>
            {isGameMaster && (
              <button 
                className="btn btn-primary mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                Criar Campanha
              </button>
            )}
          </div>
        ) : (
          <div className="campaigns-grid">
            {campaigns.map(campaign => {
              const typeInfo = getCampaignTypeInfo(campaign.campaign_type)
              return (
                <div 
                  key={campaign.id} 
                  className="campaign-card card"
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                >
                  <div className="campaign-image">
                    {campaign.image ? (
                      <img src={campaign.image} alt={campaign.name} />
                    ) : (
                      <div className="campaign-placeholder">
                        <span>{typeInfo.icon}</span>
                      </div>
                    )}
                    <span className="campaign-type-badge">{typeInfo.label}</span>
                  </div>
                  <div className="campaign-content">
                    <h3>{campaign.name}</h3>
                    <p className="text-muted text-sm">
                      {campaign.description || 'Sem descrição'}
                    </p>
                    <div className="campaign-meta">
                      <span className="text-xs text-muted">
                        {campaign.era_campaign || 'Época não definida'}
                      </span>
                      <span className="text-xs text-muted">
                        {campaign.player_count} jogador{campaign.player_count !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal de Criar Campanha */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nova Campanha</h3>
              <button 
                className="btn btn-ghost btn-icon"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCampaign}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                
                <div className="form-group">
                  <label className="label">Nome da Campanha</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Stardust Crusaders"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label className="label">Tipo / Anime</label>
                  <div className="type-selector">
                    {CAMPAIGN_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        className={`type-option ${campaignType === type.value ? 'active' : ''}`}
                        onClick={() => setCampaignType(type.value)}
                      >
                        <span className="type-icon">{type.icon}</span>
                        <span className="type-label">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="label">Descrição</label>
                  <textarea
                    className="textarea input"
                    placeholder="Uma breve descrição da campanha..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="label">Época</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: 1987"
                      value={era}
                      onChange={e => setEra(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Local</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: Japão"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="label">Imagem (opcional)</label>
                  <input
                    type="file"
                    className="input"
                    accept="image/*"
                    onChange={e => setImage(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Criando...' : 'Criar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
