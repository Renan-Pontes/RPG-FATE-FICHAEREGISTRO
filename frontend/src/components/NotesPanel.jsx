import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import * as api from '../api'
import './NotesPanel.css'

export default function NotesPanel({ character, isGameMaster = false }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (character?.id) {
      loadNotes()
    }
  }, [character?.id])

  const loadNotes = async () => {
    try {
      const data = await api.getNotes(character.id)
      setNotes(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async () => {
    if (!newNote.trim()) return
    
    setLoading(true)
    try {
      await api.createNote(character.id, newNote)
      setNewNote('')
      await loadNotes()
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id) => {
    if (!editContent.trim()) return
    
    try {
      await api.updateNote(id, editContent)
      setEditingId(null)
      setEditContent('')
      await loadNotes()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta nota?')) return
    
    try {
      await api.deleteNote(id)
      await loadNotes()
    } catch (err) {
      alert(err.message)
    }
  }

  const startEdit = (note) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  if (!character) {
    return <div className="text-muted">Selecione um personagem.</div>
  }

  const masterNotes = notes.filter(n => n.is_master_note)
  const playerNotes = notes.filter(n => !n.is_master_note)

  const canEdit = (note) => note.author === user?.id

  const renderNotesList = (list, emptyText) => {
    if (list.length === 0) {
      return <p className="text-muted text-sm">{emptyText}</p>
    }
    return list.map(note => (
      <div key={note.id} className="note-item">
        {editingId === note.id ? (
          <div className="note-edit">
            <textarea
              className="textarea input"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={3}
            />
            <div className="note-edit-actions">
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setEditingId(null)
                  setEditContent('')
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => handleUpdate(note.id)}
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="note-content">{note.content}</div>
            <div className="note-meta">
              <span className="note-date text-xs text-muted">
                {new Date(note.updated_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {canEdit(note) && (
                <div className="note-actions">
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => startEdit(note)}
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(note.id)}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    ))
  }

  return (
    <div className="notes-panel">
      <h3>📝 Notas</h3>
      <p className="text-muted text-sm mb-4">
        {isGameMaster
          ? 'Notas separadas entre mestre e jogador.'
          : 'Suas anotações sobre a campanha, eventos importantes, etc.'}
      </p>

      {/* Criar nova nota */}
      <div className="new-note">
        <textarea
          className="textarea input"
          placeholder={isGameMaster ? 'Nova nota do mestre...' : 'Escreva uma nova nota...'}
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          rows={3}
        />
        <button 
          className="btn btn-primary btn-sm"
          onClick={handleCreate}
          disabled={loading || !newNote.trim()}
        >
          Adicionar Nota
        </button>
      </div>

      {isGameMaster ? (
        <>
          <h4 className="text-sm mt-4 mb-2">Notas do Mestre</h4>
          <div className="notes-list">
            {renderNotesList(masterNotes, 'Nenhuma nota do mestre ainda.')}
          </div>
          <h4 className="text-sm mt-4 mb-2">Notas do Jogador</h4>
          <div className="notes-list">
            {renderNotesList(playerNotes, 'Nenhuma nota do jogador ainda.')}
          </div>
        </>
      ) : (
        <div className="notes-list">
          {renderNotesList(playerNotes, 'Nenhuma nota ainda.')}
        </div>
      )}
    </div>
  )
}
