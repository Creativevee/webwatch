import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import logo from '../assets/logo.png'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    try {
      const response = await client.post('/api/auth/login', {
        username: username,
        password: password,
      })
      localStorage.setItem('access_token', response.data.access_token)
      navigate('/dashboard')
    } catch (error) {
      setErrorMessage('Incorrect username or password')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src={logo} alt="WebWatch logo" className="h-10 w-10" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">WebWatch</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Log in to your account</p>
        </div>

        <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--accent)] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />

        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--accent)] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />

        {errorMessage && (
          <p className="mb-4 text-sm" style={{ color: 'var(--status-critical)' }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Log in
        </button>
      </form>
    </div>
  )
}

export default Login
