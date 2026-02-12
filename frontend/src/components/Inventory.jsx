import { useState } from 'react'
import * as api from '../api'
import './Inventory.css'

const ITEM_TYPE_ICONS = {
  weapon: '⚔️',
  armor: '🛡️',
  consumable: '🧪',
  accessory: '💍',
  quest: '📜',
  misc: '📦',
}

export default function Inventory({ character, party, onUpdate }) {
  const [activeTab, setActiveTab] = useState('equipped')
  const [selectedItem, setSelectedItem] = useState(null)
  const [transferTargetId, setTransferTargetId] = useState('')
  const [transferQty, setTransferQty] = useState(1)
  const [processing, setProcessing] = useState(false)
  
  if (!character) {
    return <div className="text-muted">Nenhum personagem selecionado.</div>
  }

  const items = character.items || []
  const equippedItems = items.filter(i => i.is_equipped)
  const bagItems = items.filter(i => !i.is_equipped)
  const transferTargets = (party || []).filter(c => c.id !== character.id)

  const openItem = (item) => {
    setSelectedItem(item)
    setTransferTargetId('')
    setTransferQty(1)
  }

  const closeItem = () => {
    setSelectedItem(null)
    setTransferTargetId('')
    setTransferQty(1)
  }

  const handleEquip = async (itemId) => {
    try {
      setProcessing(true)
      await api.equipItem(itemId)
      onUpdate?.()
      closeItem()
    } catch (err) {
      alert(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleUse = async (itemId) => {
    try {
      setProcessing(true)
      await api.useItem(itemId)
      onUpdate?.()
      closeItem()
    } catch (err) {
      alert(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleTransfer = async () => {
    if (!selectedItem || !transferTargetId) return
    const qty = Math.max(1, Math.min(transferQty, selectedItem.quantity || 1))
    try {
      setProcessing(true)
      await api.transferItem(selectedItem.id, parseInt(transferTargetId, 10), qty)
      onUpdate?.()
      closeItem()
    } catch (err) {
      alert(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="inventory">
      <div className="inventory-tabs">
        <button
          className={`inv-tab ${activeTab === 'equipped' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipped')}
        >
          Equipados ({equippedItems.length})
        </button>
        <button
          className={`inv-tab ${activeTab === 'bag' ? 'active' : ''}`}
          onClick={() => setActiveTab('bag')}
        >
          Inventário ({bagItems.length})
        </button>
      </div>

      <div className="inventory-content">
        {activeTab === 'equipped' && (
          <div className="items-grid">
            {equippedItems.length === 0 ? (
              <p className="text-muted text-sm">Nenhum item equipado.</p>
            ) : (
              equippedItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  isEquipped
                  onOpen={openItem}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'bag' && (
          <div className="items-grid">
            {bagItems.length === 0 ? (
              <p className="text-muted text-sm">Inventário vazio.</p>
            ) : (
              bagItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onOpen={openItem}
                />
              ))
            )}
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="modal-backdrop" onClick={closeItem}>
          <div className="modal inventory-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedItem.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={closeItem}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="inventory-modal-meta">
                {selectedItem.description && (
                  <p className="text-sm text-muted">{selectedItem.description}</p>
                )}
                <div className="item-meta">
                  {selectedItem.rarity && (
                    <span className={`item-qty item-rarity ${selectedItem.rarity}`}>
                      {selectedItem.rarity}
                    </span>
                  )}
                  {selectedItem.quantity > 1 && (
                    <span className="item-qty">x{selectedItem.quantity}</span>
                  )}
                  {typeof selectedItem.durability === 'number' && (
                    <span className="item-qty">Dur: {selectedItem.durability}</span>
                  )}
                  {Array.isArray(selectedItem.tags) && selectedItem.tags.length > 0 && (
                    <span className="item-tags">
                      {selectedItem.tags.map(tag => (
                        <span key={tag} className="item-tag">{tag}</span>
                      ))}
                    </span>
                  )}
                  {selectedItem.bonus_value > 0 && (
                    <span className="item-bonus">+{selectedItem.bonus_value} {selectedItem.bonus_status}</span>
                  )}
                </div>
              </div>

              <div className="inventory-modal-actions">
                {selectedItem.item_type === 'consumable' && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleUse(selectedItem.id)}
                    disabled={processing}
                  >
                    Usar
                  </button>
                )}
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleEquip(selectedItem.id)}
                  disabled={processing}
                >
                  {selectedItem.is_equipped ? 'Desequipar' : 'Equipar'}
                </button>
              </div>

              <div className="inventory-modal-transfer">
                <label className="label">Transferir para</label>
                {transferTargets.length === 0 ? (
                  <p className="text-xs text-muted">Nenhum outro personagem disponível.</p>
                ) : (
                  <>
                    <select
                      className="input"
                      value={transferTargetId}
                      onChange={e => setTransferTargetId(e.target.value)}
                    >
                      <option value="">Selecione um personagem</option>
                      {transferTargets.map(target => (
                        <option key={target.id} value={target.id}>{target.name}</option>
                      ))}
                    </select>
                    {selectedItem.quantity > 1 && (
                      <div className="form-group mt-2">
                        <label className="label">Quantidade</label>
                        <input
                          type="number"
                          className="input"
                          min="1"
                          max={selectedItem.quantity}
                          value={transferQty}
                          onChange={e => setTransferQty(parseInt(e.target.value, 10) || 1)}
                        />
                      </div>
                    )}
                    <button
                      className="btn btn-sm btn-primary mt-2"
                      onClick={handleTransfer}
                      disabled={!transferTargetId || processing}
                    >
                      Transferir
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemCard({ item, isEquipped, onOpen }) {
  const icon = ITEM_TYPE_ICONS[item.item_type] || '📦'
  const hasImage = !!item.image

  return (
    <button
      type="button"
      className={`item-card ${isEquipped ? 'equipped' : ''}`}
      onClick={() => onOpen?.(item)}
    >
      <div className="item-media">
        {hasImage ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <div className="item-icon">{icon}</div>
        )}
      </div>
      <div className="item-info">
        <div className="item-name">{item.name}</div>
        {item.description && (
          <div className="item-desc text-muted text-xs">{item.description}</div>
        )}
        <div className="item-meta">
          {item.rarity && (
            <span className={`item-qty item-rarity ${item.rarity}`}>
              {item.rarity}
            </span>
          )}
          {item.quantity > 1 && (
            <span className="item-qty">x{item.quantity}</span>
          )}
          {typeof item.durability === 'number' && (
            <span className="item-qty">Dur: {item.durability}</span>
          )}
          {Array.isArray(item.tags) && item.tags.length > 0 && (
            <span className="item-tags">
              {item.tags.map(tag => (
                <span key={tag} className="item-tag">{tag}</span>
              ))}
            </span>
          )}
          {item.bonus_value > 0 && (
            <span className="item-bonus">+{item.bonus_value} {item.bonus_status}</span>
          )}
        </div>
      </div>
    </button>
  )
}
