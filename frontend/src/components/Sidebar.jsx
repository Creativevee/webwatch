import { NavLink } from 'react-router-dom'

function Sidebar() {
  const linkClasses = ({ isActive }) =>
    isActive
      ? 'block px-4 py-2 rounded-lg font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
      : 'block px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'

  return (
    <nav className="flex h-screen w-56 flex-col gap-1 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <NavLink to="/dashboard" className={linkClasses}>Dashboard</NavLink>
      <NavLink to="/alerts" className={linkClasses}>Alerts</NavLink>
      <NavLink to="/files" className={linkClasses}>Files</NavLink>
      <NavLink to="/logs" className={linkClasses}>Logs</NavLink>
      <NavLink to="/rules" className={linkClasses}>Rules</NavLink>
    </nav>
  )
}

export default Sidebar
