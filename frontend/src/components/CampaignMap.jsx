import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import * as api from '../api'
import './CampaignMap.css'

const DEFAULT_MAP = {
  strokes: [],
  fog: [],
  groups: [],
}

const COLOR_PALETTE = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]

function normalizeMapData(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {}
  const strokes = Array.isArray(safe.strokes) ? safe.strokes : []
  const fog = Array.isArray(safe.fog) ? safe.fog : []
  const groups = Array.isArray(safe.groups) ? safe.groups : []

  return {
    strokes: strokes.map((stroke) => {
      if (Array.isArray(stroke)) {
        return { points: stroke, color: '#ef4444', width: 2 }
      }
      return {
        points: Array.isArray(stroke.points) ? stroke.points : [],
        color: stroke.color || '#ef4444',
        width: stroke.width || 2,
      }
    }),
    fog: fog.map((stroke) => {
      if (Array.isArray(stroke)) {
        return { points: stroke, color: 'rgba(15, 15, 15, 0.7)', width: 18 }
      }
      return {
        points: Array.isArray(stroke.points) ? stroke.points : [],
        color: stroke.color || 'rgba(15, 15, 15, 0.7)',
        width: stroke.width || 18,
      }
    }),
    groups: groups.map((group, index) => ({
      id: group.id || `group-${index + 1}`,
      name: group.name || `Grupo ${index + 1}`,
      members: Array.isArray(group.members)
        ? group.members
            .map(memberId => parseInt(memberId, 10))
            .filter(memberId => !Number.isNaN(memberId))
        : [],
      x: typeof group.x === 'number' ? group.x : 0.5,
      y: typeof group.y === 'number' ? group.y : 0.5,
      color: group.color || COLOR_PALETTE[index % COLOR_PALETTE.length],
    })),
  }
}

export default function CampaignMap({
  campaign,
  mapData,
  sessions = [],
  party = [],
  isGameMaster,
  onMapUpdate,
  onSessionsUpdate,
}) {
  const [localMap, setLocalMap] = useState(() => normalizeMapData(mapData?.map_data))
  const [activeTool, setActiveTool] = useState('none')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pendingImage, setPendingImage] = useState(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMembers, setNewGroupMembers] = useState([])
  const [draggingGroupId, setDraggingGroupId] = useState(null)
  const [sessionDate, setSessionDate] = useState('')
  const [sessionLocation, setSessionLocation] = useState('')
  const [sessionSummary, setSessionSummary] = useState('')
  const [sessionBusyId, setSessionBusyId] = useState(null)

  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const currentStrokeRef = useRef(null)
  const mapRef = useRef(localMap)

  const mapImage = api.mediaUrl(mapData?.map_image || null)

  useEffect(() => {
    mapRef.current = localMap
  }, [localMap])

  useEffect(() => {
    if (!mapData) {
      setLocalMap(DEFAULT_MAP)
      mapRef.current = DEFAULT_MAP
      return
    }
    const next = normalizeMapData(mapData.map_data)
    setLocalMap(next)
    mapRef.current = next
  }, [mapData?.map_updated_at])

  const partyById = useMemo(() => {
    const data = {}
    party.forEach(member => {
      data[member.id] = member.name
    })
    return data
  }, [party])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    localMap.strokes.forEach(stroke => {
      const points = stroke.points || []
      if (points.length < 2) return
      ctx.strokeStyle = stroke.color || '#ef4444'
      ctx.lineWidth = stroke.width || 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height)
      points.slice(1).forEach(point => {
        ctx.lineTo(point.x * canvas.width, point.y * canvas.height)
      })
      ctx.stroke()
    })

    localMap.fog.forEach(stroke => {
      const points = stroke.points || []
      if (points.length < 2) return
      ctx.strokeStyle = stroke.color || 'rgba(15, 15, 15, 0.7)'
      ctx.lineWidth = stroke.width || 18
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height)
      points.slice(1).forEach(point => {
        ctx.lineTo(point.x * canvas.width, point.y * canvas.height)
      })
      ctx.stroke()
    })

    const liveStroke = currentStrokeRef.current
    if (liveStroke && liveStroke.length > 1) {
      if (activeTool === 'fog') {
        ctx.strokeStyle = 'rgba(15, 15, 15, 0.6)'
        ctx.lineWidth = 18
      } else {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'
        ctx.lineWidth = 2
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(liveStroke[0].x * canvas.width, liveStroke[0].y * canvas.height)
      liveStroke.slice(1).forEach(point => {
        ctx.lineTo(point.x * canvas.width, point.y * canvas.height)
      })
      ctx.stroke()
    }
  }, [localMap, activeTool])

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return
    const width = image.clientWidth || 0
    const height = image.clientHeight || 0
    if (!width || !height) return
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    drawCanvas()
  }, [drawCanvas])

  useEffect(() => {
    if (!imageRef.current) return
    syncCanvasSize()
    const observer = new ResizeObserver(() => syncCanvasSize())
    observer.observe(imageRef.current)
    return () => observer.disconnect()
  }, [mapImage, syncCanvasSize])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const getRelativePoint = (event) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    }
  }

  const saveMapData = async (nextMap, options = {}) => {
    if (!campaign) return
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('map_data', JSON.stringify(nextMap))
      if (options.includeImage && pendingImage) {
        formData.append('map_image', pendingImage)
      }
      const updated = await api.updateMap(campaign.id, formData)
      onMapUpdate?.(updated)
      if (options.includeImage) {
        setPendingImage(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const startDrawing = (event) => {
    if (!isGameMaster || activeTool === 'none') return
    const point = getRelativePoint(event)
    if (!point) return
    event.preventDefault()
    currentStrokeRef.current = [point]
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drawCanvas()
  }

  const moveDrawing = (event) => {
    if (!isGameMaster || activeTool === 'none') return
    if (!currentStrokeRef.current) return
    const point = getRelativePoint(event)
    if (!point) return
    currentStrokeRef.current.push(point)
    drawCanvas()
  }

  const endDrawing = () => {
    if (!currentStrokeRef.current || currentStrokeRef.current.length < 2) {
      currentStrokeRef.current = null
      drawCanvas()
      return
    }
    const stroke = {
      points: currentStrokeRef.current,
      color: activeTool === 'fog' ? 'rgba(15, 15, 15, 0.7)' : '#ef4444',
      width: activeTool === 'fog' ? 18 : 2,
    }
    currentStrokeRef.current = null
    setLocalMap(prev => {
      const nextStrokesKey = activeTool === 'fog' ? 'fog' : 'strokes'
      const next = {
        ...prev,
        [nextStrokesKey]: [...prev[nextStrokesKey], stroke],
      }
      mapRef.current = next
      saveMapData(next)
      return next
    })
  }

  const handleMarkerDown = (groupId, event) => {
    if (!isGameMaster || activeTool !== 'none') return
    event.preventDefault()
    setDraggingGroupId(groupId)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!draggingGroupId) return
    const point = getRelativePoint(event)
    if (!point) return
    setLocalMap(prev => {
      const next = {
        ...prev,
        groups: prev.groups.map(group => (
          group.id === draggingGroupId
            ? { ...group, x: point.x, y: point.y }
            : group
        )),
      }
      mapRef.current = next
      return next
    })
  }

  const handlePointerUp = () => {
    if (!draggingGroupId) return
    setDraggingGroupId(null)
    saveMapData(mapRef.current)
  }

  const handleAddGroup = () => {
    const nextIndex = localMap.groups.length
    const groupName = newGroupName.trim() || `Grupo ${nextIndex + 1}`
    const group = {
      id: `group-${Date.now()}`,
      name: groupName,
      members: newGroupMembers,
      x: 0.5,
      y: 0.5,
      color: COLOR_PALETTE[nextIndex % COLOR_PALETTE.length],
    }
    setLocalMap(prev => {
      const next = {
        ...prev,
        groups: [...prev.groups, group],
      }
      mapRef.current = next
      saveMapData(next)
      return next
    })
    setNewGroupName('')
    setNewGroupMembers([])
  }

  const handleGroupChange = (groupId, patch) => {
    setLocalMap(prev => {
      const next = {
        ...prev,
        groups: prev.groups.map(group => (
          group.id === groupId ? { ...group, ...patch } : group
        )),
      }
      mapRef.current = next
      saveMapData(next)
      return next
    })
  }

  const handleRemoveGroup = (groupId) => {
    if (!confirm('Remover este grupo do mapa?')) return
    setLocalMap(prev => {
      const next = {
        ...prev,
        groups: prev.groups.filter(group => group.id !== groupId),
      }
      mapRef.current = next
      saveMapData(next)
      return next
    })
  }

  const handleClearStrokes = () => {
    if (!confirm('Apagar todos os desenhos do mapa?')) return
    setLocalMap(prev => {
      const next = { ...prev, strokes: [] }
      mapRef.current = next
      saveMapData(next)
      return next
    })
  }

  const handleClearFog = () => {
    if (!confirm('Remover toda a névoa do mapa?')) return
    setLocalMap(prev => {
      const next = { ...prev, fog: [] }
      mapRef.current = next
      saveMapData(next)
      return next
    })
  }

  const handleCreateSession = async () => {
    if (!campaign || !sessionDate) {
      setError('Informe a data da sessão.')
      return
    }
    setError('')
    try {
      const created = await api.createSession({
        campaign: campaign.id,
        date: sessionDate,
        location: sessionLocation,
        summary: sessionSummary,
      })
      onSessionsUpdate?.([created, ...(sessions || [])])
      setSessionDate('')
      setSessionLocation('')
      setSessionSummary('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSaveSessionMap = async (sessionId) => {
    setSessionBusyId(sessionId)
    setError('')
    try {
      const updated = await api.saveMapSession(sessionId)
      if (onSessionsUpdate) {
        const next = (sessions || []).map(s => (s.id === updated.id ? updated : s))
        onSessionsUpdate(next)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSessionBusyId(null)
    }
  }

  const handleLoadSessionMap = async (sessionId) => {
    setSessionBusyId(sessionId)
    setError('')
    try {
      const updatedMap = await api.loadMapSession(sessionId)
      onMapUpdate?.(updatedMap)
    } catch (err) {
      setError(err.message)
    } finally {
      setSessionBusyId(null)
    }
  }

  if (!mapImage && !isGameMaster) {
    return (
      <div className="campaign-map">
        <h3>Mapa da Campanha</h3>
        <p className="text-muted text-sm">O mestre ainda não enviou um mapa.</p>
      </div>
    )
  }

  return (
    <div className="campaign-map">
      <div className="map-header">
        <div>
          <h3>Mapa da Campanha</h3>
          <p className="text-muted text-sm">
            {isGameMaster
              ? 'Desenhe no mapa e posicione os grupos de jogadores.'
              : 'Visualize a posição dos grupos no mapa.'}
          </p>
        </div>
        {saving && <span className="text-xs text-muted">Salvando...</span>}
      </div>

      {error && <div className="alert alert-error mb-3">{error}</div>}

      {isGameMaster && (
        <div className="map-toolbar">
          <div className="map-tools">
            <button
              type="button"
              className={`btn btn-sm ${activeTool === 'draw' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTool(activeTool === 'draw' ? 'none' : 'draw')}
            >
              Desenhar
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTool === 'fog' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTool(activeTool === 'fog' ? 'none' : 'fog')}
            >
              Fog
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setActiveTool('none')}
            >
              Mover grupos
            </button>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={handleClearStrokes}>
            Limpar desenhos
          </button>
          <button className="btn btn-sm btn-ghost" onClick={handleClearFog}>
            Limpar fog
          </button>
          <div className="map-upload">
            <input
              type="file"
              className="input"
              accept="image/*"
              onChange={e => setPendingImage(e.target.files?.[0] || null)}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={() => saveMapData(localMap, { includeImage: true })}
              disabled={!pendingImage || saving}
            >
              Atualizar mapa
            </button>
          </div>
        </div>
      )}

      {mapImage ? (
        <div
          className={`map-canvas-wrapper ${activeTool !== 'none' ? 'draw-mode' : ''}`}
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <img
            src={mapImage}
            alt="Mapa da campanha"
            className="map-image"
            ref={imageRef}
            onLoad={syncCanvasSize}
          />
          <canvas
            ref={canvasRef}
            className="map-canvas"
            onPointerDown={startDrawing}
            onPointerMove={moveDrawing}
            onPointerUp={endDrawing}
            onPointerLeave={endDrawing}
          />
          {localMap.groups.map(group => {
            const memberNames = group.members
              .map(id => partyById[id])
              .filter(Boolean)
              .join(', ')
            return (
              <div
                key={group.id}
                className={`map-marker ${!isGameMaster ? 'readonly' : ''}`}
                style={{
                  left: `${group.x * 100}%`,
                  top: `${group.y * 100}%`,
                  background: group.color,
                }}
                title={memberNames}
                onPointerDown={(event) => handleMarkerDown(group.id, event)}
              >
                <span>{group.name}</span>
                {group.members.length > 0 && (
                  <em>{group.members.length}</em>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="map-empty">
          <p className="text-muted">Envie uma imagem para começar o mapa.</p>
        </div>
      )}

      {isGameMaster && (
        <div className="map-groups">
          <h4 className="text-sm mb-2">Grupos de Jogadores</h4>
          <div className="card mb-3">
            <div className="form-group">
              <label className="label">Nome do Grupo</label>
              <input
                type="text"
                className="input"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Ex: Equipe Alfa"
              />
            </div>
            <div className="form-group">
              <label className="label">Membros</label>
              <select
                multiple
                className="input"
                value={newGroupMembers.map(String)}
                onChange={e => {
                  const values = Array.from(e.target.selectedOptions).map(opt => parseInt(opt.value, 10))
                  setNewGroupMembers(values)
                }}
              >
                {party.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleAddGroup}>
              Adicionar grupo
            </button>
          </div>

          {localMap.groups.length === 0 ? (
            <p className="text-muted text-sm">Nenhum grupo criado ainda.</p>
          ) : (
            <div className="list">
              {localMap.groups.map(group => (
                <div key={group.id} className="group-card">
                  <div className="group-header">
                    <input
                      type="text"
                      className="input"
                      value={group.name}
                      onChange={e => handleGroupChange(group.id, { name: e.target.value })}
                    />
                    <button className="btn btn-sm btn-ghost" onClick={() => handleRemoveGroup(group.id)}>
                      Remover
                    </button>
                  </div>
                  <div className="group-members">
                    {party.length === 0 && (
                      <p className="text-xs text-muted">Sem jogadores na campanha.</p>
                    )}
                    {party.map(member => {
                      const checked = group.members.includes(member.id)
                      return (
                        <label key={member.id} className="list-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const nextMembers = e.target.checked
                                ? [...group.members, member.id]
                                : group.members.filter(id => id !== member.id)
                              handleGroupChange(group.id, { members: nextMembers })
                            }}
                          />
                          <span className="ml-2">{member.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isGameMaster && (
        <div className="map-sessions">
          <h4 className="text-sm mb-2">Sessões</h4>
          <div className="card mb-3">
            <div className="form-group">
              <label className="label">Data</label>
              <input
                type="date"
                className="input"
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Local</label>
              <input
                type="text"
                className="input"
                value={sessionLocation}
                onChange={e => setSessionLocation(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="form-group">
              <label className="label">Resumo</label>
              <textarea
                className="textarea input"
                rows={2}
                value={sessionSummary}
                onChange={e => setSessionSummary(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleCreateSession}>
              Criar sessão
            </button>
          </div>

          {sessions.length === 0 ? (
            <p className="text-muted text-sm">Nenhuma sessão registrada.</p>
          ) : (
            <div className="list">
              {sessions.map(session => (
                <div key={session.id} className="list-item session-item">
                  <div className="session-info">
                    <strong>{session.date}</strong>
                    {session.location && (
                      <div className="text-xs text-muted">{session.location}</div>
                    )}
                    {session.summary && (
                      <div className="text-xs text-muted">{session.summary}</div>
                    )}
                  </div>
                  <div className="session-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleSaveSessionMap(session.id)}
                      disabled={sessionBusyId === session.id}
                    >
                      {sessionBusyId === session.id ? 'Salvando...' : 'Salvar mapa'}
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleLoadSessionMap(session.id)}
                      disabled={sessionBusyId === session.id}
                    >
                      {sessionBusyId === session.id ? 'Carregando...' : 'Carregar mapa'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
