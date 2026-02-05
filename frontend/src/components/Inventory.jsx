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
  
  if (!character) {
    return <div className="text-muted">Nenhum personagem selecionado.</div>
  }

  const items = character.items || []
  const equippedItems = items.filter(i => i.is_equipped)
  const bagItems = items.filter(i => !i.is_equipped)

  const handleEquip = async (itemId) => {
    try {
      await api.equipItem(itemId)
      onUpdate?.()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUse = async (itemId) => {
    try {
      await api.useItem(itemId)
      onUpdate?.()
    } catch (err) {
      alert(err.message)
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
                  onEquip={handleEquip}
                  isEquipped
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
                  onEquip={handleEquip}
                  onUse={item.item_type === 'consumable' ? handleUse : null}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ItemCard({ item, onEquip, onUse, isEquipped }) {
  const icon = ITEM_TYPE_ICONS[item.item_type] || '📦'

  return (
    <div className={`item-card ${isEquipped ? 'equipped' : ''}`}>
      <div className="item-icon">{icon}</div>
      <div className="item-info">
        <div className="item-name">{item.name}</div>
        {item.description && (
          <div className="item-desc text-muted text-xs">{item.description}</div>
        )}
        <div className="item-meta">
          {item.quantity > 1 && (
            <span className="item-qty">x{item.quantity}</span>
          )}
          {typeof item.durability === 'number' && (
            <span className="item-qty">Dur: {item.durability}</span>
          )}
          {item.bonus_value > 0 && (
            <span className="item-bonus">+{item.bonus_value} {item.bonus_status}</span>
          )}
        </div>
      </div>
      <div className="item-actions">
        {onUse && (
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => onUse(item.id)}
          >
            Usar
          </button>
        )}
        <button 
          className="btn btn-sm btn-ghost"
          onClick={() => onEquip(item.id)}
        >
          {isEquipped ? 'Desequipar' : 'Equipar'}
        </button>
      </div>
    </div>
  )
}
