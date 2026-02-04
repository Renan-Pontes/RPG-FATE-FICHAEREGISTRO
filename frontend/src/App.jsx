import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [characters, setCharacters] = useState([])
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsReloadKey, setItemsReloadKey] = useState(0)
  const [activeTab, setActiveTab] = useState('characters')
  const [transferTargets, setTransferTargets] = useState({})
  const [campaignName, setCampaignName] = useState('')
  const [campaignDescription, setCampaignDescription] = useState('')
  const [campaignEra, setCampaignEra] = useState('')
  const [campaignLocation, setCampaignLocation] = useState('')
  const [campaignImageFile, setCampaignImageFile] = useState(null)
  const [itemName, setItemName] = useState('')
  const [itemType, setItemType] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemDurability, setItemDurability] = useState(100)
  const [itemOwnerCharacterId, setItemOwnerCharacterId] = useState('')
  const [characterName, setCharacterName] = useState('')
  const [characterDescription, setCharacterDescription] = useState('')
  const [characterCampaignId, setCharacterCampaignId] = useState('')
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'
  const apiOrigin = apiBase.replace(/\/api\/?$/, '')

  useEffect(() => {
    const stored = localStorage.getItem('auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setCurrentUser({ ...parsed, is_game_master: !!parsed.is_game_master })
      } catch {
        localStorage.removeItem('auth')
      }
    }
  }, [])

  useEffect(() => {
    if (!currentUser?.token) {
      setCampaigns([])
      setCharacters([])
      setItems([])
      return
    }

    const headers = {
      Authorization: `Token ${currentUser.token}`,
    }

    const fetchCampaigns = async () => {
      setCampaignsLoading(true)
      try {
        const response = await fetch(`${apiBase}/campaigns/`, { headers })
        const data = await response.json()
        if (response.ok) {
          setCampaigns(data)
        } else {
          setStatus('error', 'Nao foi possivel carregar campanhas.')
        }
      } catch (error) {
        setStatus('error', 'Nao foi possivel conectar ao servidor.')
      } finally {
        setCampaignsLoading(false)
      }
    }

    const fetchCharacters = async () => {
      try {
        const endpoint = characterCampaignId
          ? `${apiBase}/characters/?campaign=${characterCampaignId}`
          : `${apiBase}/characters/`
        const response = await fetch(endpoint, { headers })
        const data = await response.json()
        if (response.ok) {
          setCharacters(data)
        } else {
          setStatus('error', 'Nao foi possivel carregar fichas.')
        }
      } catch (error) {
        setStatus('error', 'Nao foi possivel conectar ao servidor.')
      }
    }

    const fetchItems = async () => {
      if (!characterCampaignId) {
        setItems([])
        return
      }
      setItemsLoading(true)
      try {
        const response = await fetch(
          `${apiBase}/items/?campaign=${characterCampaignId}`,
          { headers },
        )
        const data = await response.json()
        if (response.ok) {
          setItems(data)
        } else {
          setStatus('error', 'Nao foi possivel carregar itens.')
        }
      } catch (error) {
        setStatus('error', 'Nao foi possivel conectar ao servidor.')
      } finally {
        setItemsLoading(false)
      }
    }

    fetchCampaigns()
    fetchCharacters()
    fetchItems()
  }, [apiBase, currentUser?.token, characterCampaignId, itemsReloadKey])

  const setStatus = (type, message) => {
    setStatusType(type)
    setStatusMessage(message)
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setStatus('', '')
    if (!loginUsername || !loginPassword) {
      setStatus('error', 'Informe usuario e senha.')
      return
    }

    try {
      const response = await fetch(`${apiBase}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setStatus('error', data.detail || 'Falha no login.')
        return
      }
      const normalized = { ...data, is_game_master: !!data.is_game_master }
      localStorage.setItem('auth', JSON.stringify(normalized))
      setCurrentUser(normalized)
      setStatus('success', `Conectado como ${data.username}.`)
    } catch (error) {
      setStatus('error', 'Nao foi possivel conectar ao servidor.')
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setStatus('', '')
    if (!registerUsername || !registerPassword) {
      setStatus('error', 'Preencha usuario e senha.')
      return
    }
    if (registerPassword !== registerPasswordConfirm) {
      setStatus('error', 'As senhas nao conferem.')
      return
    }

    try {
      const response = await fetch(`${apiBase}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus('error', data.detail || 'Falha no registro.')
        return
      }
      const normalized = { ...data, is_game_master: !!data.is_game_master }
      localStorage.setItem('auth', JSON.stringify(normalized))
      setCurrentUser(normalized)
      setIsRegisterOpen(false)
      setStatus('success', `Conta criada para ${data.username}.`)
    } catch (error) {
      setStatus('error', 'Nao foi possivel registrar.')
    }
  }

  const handleCreateCampaign = async (event) => {
    event.preventDefault()
    if (!campaignName) {
      setStatus('error', 'Informe o nome da campanha.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('name', campaignName)
      formData.append('description', campaignDescription)
      formData.append('era_campaign', campaignEra)
      formData.append('location_campaign', campaignLocation)
      if (campaignImageFile) {
        formData.append('image', campaignImageFile)
      }
      const response = await fetch(`${apiBase}/campaigns/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${currentUser.token}`,
        },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus('error', data.detail || 'Falha ao criar campanha.')
        return
      }
      setCampaigns((prev) => [data, ...prev])
      setCampaignName('')
      setCampaignDescription('')
      setCampaignEra('')
      setCampaignLocation('')
      setCampaignImageFile(null)
      setStatus('success', 'Campanha criada.')
    } catch (error) {
      setStatus('error', 'Nao foi possivel criar campanha.')
    }
  }

  const handleCreateItem = async (event) => {
    event.preventDefault()
    if (!itemName || !itemOwnerCharacterId) {
      setStatus('error', 'Informe nome do item e personagem.')
      return
    }

    try {
      const response = await fetch(`${apiBase}/items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${currentUser.token}`,
        },
        body: JSON.stringify({
          name: itemName,
          type_item: itemType,
          description: itemDescription,
          durability: Number(itemDurability),
          owner_character: Number(itemOwnerCharacterId),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus('error', data.detail || 'Falha ao criar item.')
        return
      }
      setItemName('')
      setItemType('')
      setItemDescription('')
      setItemDurability(100)
      setItemOwnerCharacterId('')
      setItemsReloadKey((value) => value + 1)
      setStatus('success', 'Item criado.')
    } catch (error) {
      setStatus('error', 'Nao foi possivel criar item.')
    }
  }

  const handleTransferItem = async (itemId) => {
    const targetId = transferTargets[itemId]
    if (!targetId) {
      setStatus('error', 'Selecione o personagem para transferir.')
      return
    }
    try {
      const response = await fetch(`${apiBase}/items/${itemId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${currentUser.token}`,
        },
        body: JSON.stringify({
          owner_character: Number(targetId),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus('error', data.detail || 'Falha ao transferir item.')
        return
      }
      setTransferTargets((prev) => ({ ...prev, [itemId]: '' }))
      setItemsReloadKey((value) => value + 1)
      setStatus('success', 'Item transferido.')
    } catch (error) {
      setStatus('error', 'Nao foi possivel transferir item.')
    }
  }

  const handleCreateCharacter = async (event) => {
    event.preventDefault()
    if (!characterName || !characterCampaignId) {
      setStatus('error', 'Informe nome e campanha.')
      return
    }

    try {
      const response = await fetch(`${apiBase}/characters/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${currentUser.token}`,
        },
        body: JSON.stringify({
          name: characterName,
          description: characterDescription,
          Campaign: Number(characterCampaignId),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus('error', data.detail || 'Falha ao criar ficha.')
        return
      }
      setCharacters((prev) => [data, ...prev])
      setCharacterName('')
      setCharacterDescription('')
      setStatus('success', 'Ficha criada.')
    } catch (error) {
      setStatus('error', 'Nao foi possivel criar ficha.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth')
    setCurrentUser(null)
    setLoginUsername('')
    setLoginPassword('')
    setCampaignName('')
    setCampaignDescription('')
    setCampaignEra('')
    setCampaignLocation('')
    setCampaignImageFile(null)
    setItemName('')
    setItemType('')
    setItemDescription('')
    setItemDurability(100)
    setItemOwnerCharacterId('')
    setCharacterName('')
    setCharacterDescription('')
    setCharacterCampaignId('')
    setActiveTab('characters')
    setTransferTargets({})
    setStatus('success', 'Voce saiu da conta.')
  }

  const selectedCampaign = campaigns.find(
    (campaign) => campaign.id === Number(characterCampaignId),
  )

  return (
    <div className="app">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <header className="topbar">
        <span className="brand">FATE Forge</span>
        <span className="tag">Mesa do Mestre</span>
      </header>

      <main className="layout">
        <section className="hero">
          <p className="eyebrow">FATE Accelerated</p>
          <h1>Controle a mesa, sem bagunça.</h1>
          <p className="lead">
            Um painel simples para o mestre organizar campanhas, personagens e
            rolagens. O jogador ve o resultado, voce domina os bastidores.
          </p>
          <div className="pill-row">
            <span className="pill">Campanhas</span>
            <span className="pill">Personagens</span>
            <span className="pill">Notas do Mestre</span>
          </div>
        </section>

        <section className="panel">
          {currentUser ? (
            <div className="dashboard">
              <div className="card">
                <div className="card-head">
                  <div>
                    <h2>Dashboard</h2>
                    <p className="muted">Conectado como {currentUser.username}.</p>
                  </div>
                  <button className="secondary" type="button" onClick={handleLogout}>
                    Sair
                  </button>
                </div>
                {statusMessage && (
                  <div className={`alert ${statusType}`}>{statusMessage}</div>
                )}
                <div className="campaign-grid">
                  <div className="list-title">Campanhas</div>
                  {campaignsLoading && (
                    <div className="muted small">Carregando campanhas...</div>
                  )}
                  {!campaignsLoading && campaigns.length > 0 && (
                    <div className="muted small">
                      Clique em uma campanha para criar ficha nela.
                    </div>
                  )}
                  {!campaignsLoading && campaigns.length === 0 && (
                    <div className="muted small">
                      {currentUser.is_game_master
                        ? 'Nenhuma campanha criada ainda.'
                        : 'Nao existe campanha. Aguarde o DM criar.'}
                    </div>
                  )}
                  {!campaignsLoading &&
                    campaigns.map((campaign) => (
                      <button
                        className={`campaign-card ${
                          Number(characterCampaignId) === campaign.id
                            ? 'selected'
                            : ''
                        }`}
                        key={campaign.id}
                        type="button"
                        onClick={() => {
                          setCharacterCampaignId(String(campaign.id))
                          setActiveTab('characters')
                          const form = document.getElementById('character-form')
                          if (form) {
                            form.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                        }}
                      >
                        <div className="campaign-media">
                          {campaign.image ? (
                            <img
                              src={
                                campaign.image.startsWith('http')
                                  ? campaign.image
                                  : `${apiOrigin}${campaign.image}`
                              }
                              alt={campaign.name}
                            />
                          ) : (
                            <div className="campaign-placeholder">Sem imagem</div>
                          )}
                        </div>
                        <div className="campaign-body">
                          <div className="campaign-title">{campaign.name}</div>
                          <div className="campaign-desc">
                            {campaign.description || 'Sem descricao.'}
                          </div>
                          <div className="campaign-meta">
                            <span>
                              Epoca:{' '}
                              {campaign.era_campaign ||
                                (campaign.date_campaign ? campaign.date_campaign : 'Nao informado')}
                            </span>
                            <span>
                              Local: {campaign.location_campaign || 'Nao informado'}
                            </span>
                          </div>
                        </div>
                      </button>
                  ))}
                </div>
              </div>

              {currentUser.is_game_master && (
                <div className="card">
                  <h2>Criar campanha</h2>
                  <p className="muted">Apenas DM pode criar campanhas.</p>
                  <form className="form" onSubmit={handleCreateCampaign}>
                    <label>
                      <span>Nome da campanha</span>
                      <input
                        type="text"
                        placeholder="Nome da campanha"
                        value={campaignName}
                        onChange={(event) => setCampaignName(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Descricao</span>
                      <input
                        type="text"
                        placeholder="Resumo curto"
                        value={campaignDescription}
                        onChange={(event) => setCampaignDescription(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Epoca</span>
                      <input
                        type="text"
                        placeholder="Ex: Era medieval"
                        value={campaignEra}
                        onChange={(event) => setCampaignEra(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Localidade</span>
                      <input
                        type="text"
                        placeholder="Ex: Cidade subterranea"
                        value={campaignLocation}
                        onChange={(event) => setCampaignLocation(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setCampaignImageFile(event.target.files?.[0] || null)
                        }
                      />
                    </label>
                    <button className="primary" type="submit">
                      Criar campanha
                    </button>
                  </form>
                </div>
              )}

              {characterCampaignId ? (
                <div className="card" id="character-form">
                  <div className="card-head">
                    <div>
                      <h2>{selectedCampaign?.name || 'Campanha selecionada'}</h2>
                      <p className="muted">
                        Gerencie suas fichas, itens e habilidades.
                      </p>
                    </div>
                  </div>
                  <div className="tab-bar">
                    <button
                      className={`tab ${activeTab === 'characters' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActiveTab('characters')}
                    >
                      Fichas
                    </button>
                    <button
                      className={`tab ${activeTab === 'items' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActiveTab('items')}
                    >
                      Itens
                    </button>
                    <button
                      className={`tab ${activeTab === 'abilities' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActiveTab('abilities')}
                    >
                      Habilidades
                    </button>
                  </div>

                  {activeTab === 'characters' && (
                    <div className="tab-panel">
                      <form className="form" onSubmit={handleCreateCharacter}>
                        <label>
                          <span>Nome do personagem</span>
                          <input
                            type="text"
                            placeholder="Nome do personagem"
                            value={characterName}
                            onChange={(event) => setCharacterName(event.target.value)}
                          />
                        </label>
                        <label>
                          <span>Descricao</span>
                          <input
                            type="text"
                            placeholder="Resumo curto"
                            value={characterDescription}
                            onChange={(event) =>
                              setCharacterDescription(event.target.value)
                            }
                          />
                        </label>
                        <button className="primary" type="submit">
                          Criar ficha na campanha
                        </button>
                      </form>

                      <div className="list">
                        <div className="list-title">Fichas na campanha</div>
                        {characters.length === 0 && (
                          <div className="muted small">
                            Nenhuma ficha criada ainda.
                          </div>
                        )}
                        {characters.map((char) => (
                          <div className="list-item" key={char.id}>
                            <div>
                              <strong>{char.name}</strong>
                              <div className="muted small">{char.description}</div>
                              <div className="muted small">
                                {char.role ? `Papel: ${char.role}` : ''}
                                {char.hierarchy ? ` • Hierarquia: ${char.hierarchy}` : ''}
                              </div>
                            </div>
                            <span className="pill small">#{char.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'items' && (
                    <div className="tab-panel">
                      {currentUser.is_game_master && (
                        <form className="form" onSubmit={handleCreateItem}>
                          <div className="list-title">Adicionar item</div>
                          <label>
                            <span>Nome</span>
                            <input
                              type="text"
                              placeholder="Nome do item"
                              value={itemName}
                              onChange={(event) => setItemName(event.target.value)}
                            />
                          </label>
                          <label>
                            <span>Tipo</span>
                            <input
                              type="text"
                              placeholder="Ex: arma, consumivel"
                              value={itemType}
                              onChange={(event) => setItemType(event.target.value)}
                            />
                          </label>
                          <label>
                            <span>Descricao</span>
                            <input
                              type="text"
                              placeholder="Resumo curto"
                              value={itemDescription}
                              onChange={(event) =>
                                setItemDescription(event.target.value)
                              }
                            />
                          </label>
                          <label>
                            <span>Durabilidade</span>
                            <input
                              type="number"
                              min="0"
                              value={itemDurability}
                              onChange={(event) =>
                                setItemDurability(event.target.value)
                              }
                            />
                          </label>
                          <label>
                            <span>Personagem</span>
                            <select
                              value={itemOwnerCharacterId}
                              onChange={(event) =>
                                setItemOwnerCharacterId(event.target.value)
                              }
                            >
                              <option value="">Selecione</option>
                              {characters.map((char) => (
                                <option key={char.id} value={char.id}>
                                  {char.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button className="primary" type="submit">
                            Criar item
                          </button>
                        </form>
                      )}

                      <div className="list">
                        <div className="list-title">Itens na campanha</div>
                        {itemsLoading && (
                          <div className="muted small">Carregando itens...</div>
                        )}
                        {!itemsLoading && items.length === 0 && (
                          <div className="muted small">Nenhum item encontrado.</div>
                        )}
                        {!itemsLoading &&
                          items.map((itm) => (
                            <div className="list-item" key={itm.id}>
                              <div>
                                <strong>{itm.name}</strong>
                                <div className="muted small">{itm.description}</div>
                                <div className="muted small">
                                  {itm.type_item ? `Tipo: ${itm.type_item}` : ''}
                                  {itm.owner_character_name
                                    ? ` • Dono: ${itm.owner_character_name}`
                                    : ''}
                                </div>
                              </div>
                              <div className="item-actions">
                                <select
                                  value={transferTargets[itm.id] || ''}
                                  onChange={(event) =>
                                    setTransferTargets((prev) => ({
                                      ...prev,
                                      [itm.id]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Transferir para...</option>
                                  {characters.map((char) => (
                                    <option key={char.id} value={char.id}>
                                      {char.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="secondary"
                                  type="button"
                                  onClick={() => handleTransferItem(itm.id)}
                                >
                                  Transferir
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'abilities' && (
                    <div className="tab-panel">
                      <div className="list">
                        <div className="list-title">Habilidades por personagem</div>
                        {characters.length === 0 && (
                          <div className="muted small">
                            Nenhuma ficha na campanha.
                          </div>
                        )}
                        {characters.map((char) => (
                          <div className="list-item" key={char.id}>
                            <div>
                              <strong>{char.name}</strong>
                              <div className="muted small">{char.description}</div>
                              <div className="ability-list">
                                {(char.abilities || []).length === 0 && (
                                  <span className="muted small">
                                    Sem habilidades.
                                  </span>
                                )}
                                {(char.abilities || []).map((ability) => (
                                  <span className="pill small" key={ability.id}>
                                    {ability.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span className="pill small">#{char.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card" id="character-form">
                  <h2>Selecione uma campanha</h2>
                  <p className="muted">
                    Clique em um card de campanha para criar ficha e ver itens.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="card">
                <h2>Entrar</h2>
                <p className="muted">
                  Acesse sua mesa e continue a sessao de onde parou.
                </p>
                {statusMessage && (
                  <div className={`alert ${statusType}`}>{statusMessage}</div>
                )}
                <form className="form" onSubmit={handleLogin}>
                  <label>
                    <span>Usuario</span>
                    <input
                      type="text"
                      placeholder="mestre"
                      value={loginUsername}
                      onChange={(event) => setLoginUsername(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Senha</span>
                    <input
                      type="password"
                      placeholder="Sua senha"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                    />
                  </label>
                  <button className="primary" type="submit">
                    Entrar
                  </button>
                </form>
                <div className="form-footer">
                  <button
                    className="link"
                    type="button"
                    onClick={() => setIsRegisterOpen(true)}
                  >
                    Criar conta
                  </button>
                  <button className="link" type="button">
                    Esqueci a senha
                  </button>
                </div>
              </div>
              <div className="hint">
                Dica do mestre: prepare ganchos curtos e deixe espaco para improviso.
              </div>
            </>
          )}
        </section>
      </main>

      {isRegisterOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsRegisterOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Cadastro"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Criar conta</h2>
              <button
                className="icon-button"
                type="button"
                onClick={() => setIsRegisterOpen(false)}
              >
                x
              </button>
            </div>
            <p className="muted">
              Seu painel do mestre fica pronto em menos de 1 minuto.
            </p>
            <form className="form" onSubmit={handleRegister}>
              <label>
                <span>Usuario</span>
                <input
                  type="text"
                  placeholder="mestre"
                  value={registerUsername}
                  onChange={(event) => setRegisterUsername(event.target.value)}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  placeholder="voce@mesa.com"
                  value={registerEmail}
                  onChange={(event) => setRegisterEmail(event.target.value)}
                />
              </label>
              <label>
                <span>Senha</span>
                <input
                  type="password"
                  placeholder="Crie uma senha"
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                />
              </label>
              <label>
                <span>Confirmar senha</span>
                <input
                  type="password"
                  placeholder="Repita a senha"
                  value={registerPasswordConfirm}
                  onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
                />
              </label>
              <button className="primary" type="submit">
                Registrar
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => setIsRegisterOpen(false)}
              >
                Ja tenho conta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
