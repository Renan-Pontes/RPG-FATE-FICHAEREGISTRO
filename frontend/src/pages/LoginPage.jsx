import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, login, register } = useAuth()
  
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!username || !password) {
      setError('Preencha todos os campos.')
      return
    }
    
    if (isRegister && password !== passwordConfirm) {
      setError('As senhas não conferem.')
      return
    }
    
    setLoading(true)
    try {
      if (isRegister) {
        await register(username, email, password)
      } else {
        await login(username, password)
      }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Falha na autenticação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb orb-1" />
        <div className="login-orb orb-2" />
      </div>
      
      <div className="login-container">
        <div className="login-hero">
          <h1 className="display">FATE FORGE</h1>
          <p className="login-tagline">Mesa do Mestre</p>
          <p className="login-description">
            Um painel simples para o mestre organizar campanhas, personagens e 
            rolagens. O jogador vê o resultado, você domina os bastidores.
          </p>
          <div className="login-features">
            <span className="badge badge-accent">Campanhas</span>
            <span className="badge badge-accent">Personagens</span>
            <span className="badge badge-accent">Rolagem FATE</span>
            <span className="badge badge-accent">Inventário</span>
          </div>
        </div>
        
        <div className="login-card card animate-slide-up">
          <h2>{isRegister ? 'Criar Conta' : 'Entrar'}</h2>
          <p className="text-muted text-sm mb-4">
            {isRegister 
              ? 'Crie sua conta para acessar a mesa.'
              : 'Acesse sua mesa e continue a sessão.'}
          </p>
          
          {error && <div className="alert alert-error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Usuário</label>
              <input
                type="text"
                className="input"
                placeholder="mestre"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            {isRegister && (
              <div className="form-group">
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="voce@mesa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
            
            <div className="form-group">
              <label className="label">Senha</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {isRegister && (
              <div className="form-group">
                <label className="label">Confirmar Senha</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </div>
            )}
            
            <button 
              type="submit" 
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? 'Carregando...' : (isRegister ? 'Criar Conta' : 'Entrar')}
            </button>
          </form>
          
          <div className="login-footer">
            <button 
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setIsRegister(!isRegister)
                setError('')
              }}
            >
              {isRegister ? 'Já tenho conta' : 'Criar conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
