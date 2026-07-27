import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  return (
    <div>
      <h2>Dashboard</h2>
      <p>You are logged in.</p>
      <button onClick={handleLogout}>Log out</button>
    </div>
  )
}

export default Dashboard
