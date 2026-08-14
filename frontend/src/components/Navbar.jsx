import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Search } from 'lucide-react'
import client from '../api/client'
import logo from '../assets/logo.png'

function Navbar() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      const res = await client.get('/api/auth/me')
      setUser(res.data)
    }
    fetchUser()
  }, [])

  function handleLogout() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  const pillClasses = ({ isActive }) =>
    isActive
      ? 'rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-900 shadow dark:bg-gray-950 dark:text-gray-100'
      : 'rounded-full px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '..'

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-2">
        <img src={logo} alt="WebWatch logo" className="h-8 w-8" />
        <span className="font-semibold text-gray-900 dark:text-gray-100">WebWatch</span>
      </div>

      <nav className="flex items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-900">
        <NavLink to="/dashboard" className={pillClasses}>Dashboard</NavLink>
        <NavLink to="/alerts" className={pillClasses}>Alerts</NavLink>
        <NavLink to="/files" className={pillClasses}>Files</NavLink>
        <NavLink to="/logs" className={pillClasses}>Logs</NavLink>
        <NavLink to="/rules" className={pillClasses}>Rules</NavLink>
      </nav>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Search (not wired up yet)"
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
        >
          <Search size={18} />
        </button>
        <button
          type="button"
          title="Notifications (not wired up yet)"
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
        >
          <Bell size={18} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="text-left leading-tight">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.username || 'Loading...'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
