import './ProjectionArea.css'

export default function ProjectionArea({ projection, campaign, isGameMaster, onUpdate }) {
  const hasProjection = projection?.image

  return (
    <div className="projection-area">
      {hasProjection ? (
        <div className="projection-content">
          <img 
            src={projection.image} 
            alt={projection.title || 'Projeção'} 
            className="projection-image"
          />
          {projection.title && (
            <div className="projection-caption">
              <p>{projection.title}</p>
            </div>
          )}
        </div>
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
                src={campaign.image} 
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
