import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { storage } from '../lib/storage'
import { loginStaff } from '../services/authService'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await loginStaff(email, password)
      storage.setToken(data.token)
      storage.setUser(data.user)
      const from = location.state?.from ?? '/create-exam'
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <p className="brand-tag">NCC Exam Portal</p>
        <h1>Admin Sign In</h1>
        <p className="muted">Use your staff credentials to access dashboard controls.</p>

        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error ? <p className="error">{error}</p> : null}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
