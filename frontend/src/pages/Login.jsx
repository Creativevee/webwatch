import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'

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
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>

      <label htmlFor="username">Username</label>
      <input
        id="username"
        type="text"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {errorMessage && <p>{errorMessage}</p>}

      <button type="submit">Log in</button>
    </form>
  )
}

export default Login
