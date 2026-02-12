import { useState } from 'react'
import * as api from '../api'
import './ProjectionArea.css'

export default function ProjectionArea({ projection, campaign, isGameMaster }) {
  const image = api.mediaUrl(projection?.image || projection?.projection_image)
  const title = projection?.title || projection?.projection_title
  const hasProjection = !!image
  const [fitMode, setFitMode] = useState('contain')
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <div className="projection-area">
      {hasProjection ? (
        <>
          <div className="projection-content">
            <div className="projection-frame">
              <img
                src={image}
                alt={title || 'Projeção'}
                className={`projection-image ${fitMode}`}
                onClick={() => setFullscreen(true)}
              />
              <div className="projection-controls">
                <button
                  className={`btn btn-sm ${fitMode === 'contain' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFitMode('contain')}
                  type="button"
                >
                  Ajustar
                </button>
                <button
                  className={`btn btn-sm ${fitMode === 'cover' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFitMode('cover')}
                  type="button"
                >
                  Preencher
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setFullscreen(true)}
                  type="button"
                >
                  Tela cheia
                </button>
              </div>
            </div>
            {title && (
              <div className="projection-caption">
                <p>{title}</p>
              </div>
            )}
          </div>

          {fullscreen && (
            <div className="projection-modal" onClick={() => setFullscreen(false)}>
              <button
                className="btn btn-ghost projection-modal-close"
                onClick={() => setFullscreen(false)}
                type="button"
              >
                Fechar
              </button>
              <img
                src={image}
                alt={title || 'Projeção'}
                className="projection-modal-image"
              />
              {title && (
                <div className="projection-modal-caption">{title}</div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="projection-empty">
          <div className="empty-content">
            <span className="empty-icon">🎬</span>
            <h3>{campaign?.name}</h3>
            <p className="text-muted">
              {isGameMaster 
                ? 'Use a aba "Projeção" para mostrar imagens para os jogadores.'
                : 'Aguardando o mestre projetar uma imagem...'}
            </p>
            
            {campaign?.image && (
              <img 
                src={api.mediaUrl(campaign.image)} 
                alt={campaign.name}
                className="campaign-banner"
              />
            )}
            
            <div className="campaign-details">
              {campaign?.era_campaign && (
                <span className="badge">📅 {campaign.era_campaign}</span>
              )}
              {campaign?.location_campaign && (
                <span className="badge">📍 {campaign.location_campaign}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
