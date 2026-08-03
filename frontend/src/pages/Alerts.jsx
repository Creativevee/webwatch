import { useEffect, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import AlertCard from '../components/AlertCard'
import AlertModal from '../components/AlertModal'

const PAGE_SIZE = 20

const filterFieldClasses =
  'bg-transparent px-4 py-2 text-sm text-gray-900 focus:outline-none dark:text-gray-100'

function Alerts() {
  const [severity, setSeverity] = useState('')
  const [category, setCategory] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [date, setDate] = useState('')
  const [skip, setSkip] = useState(0)

  const [alerts, setAlerts] = useState([])
  const [selectedAlert, setSelectedAlert] = useState(null)

  useEffect(() => {
    async function fetchAlerts() {
      const res = await client.get('/api/alerts', {
        params: {
          severity: severity || undefined,
          category: category || undefined,
          ip_address: ipAddress || undefined,
          start_date: date ? `${date}T00:00:00` : undefined,
          end_date: date ? `${date}T23:59:59` : undefined,
          skip,
          limit: PAGE_SIZE,
        },
      })
      setAlerts(res.data)
    }
    fetchAlerts()
  }, [severity, category, ipAddress, date, skip])

  function handleFilterChange(setter) {
    return (event) => {
      setSkip(0)
      setter(event.target.value)
    }
  }

  async function handleResolve(alertId) {
    await client.put(`/api/alerts/${alertId}`, { is_resolved: true })
    setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, is_resolved: true } : a)))
    setSelectedAlert(null)
  }

  async function handleDelete(alertId) {
    await client.delete(`/api/alerts/${alertId}`)
    setAlerts(alerts.filter((a) => a.id !== alertId))
    setSelectedAlert(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6">

        <div className="ml-auto flex w-fit flex-wrap divide-x divide-gray-200 rounded-full border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          <select
            value={severity}
            onChange={handleFilterChange(setSeverity)}
            className={`${filterFieldClasses} rounded-l-full`}
          >
            <option value="" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">All severities</option>
            <option value="high" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">High</option>
            <option value="medium" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">Medium</option>
            <option value="low" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">Low</option>
          </select>

          <select
            value={category}
            onChange={handleFilterChange(setCategory)}
            className={filterFieldClasses}
          >
            <option value="" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">All categories</option>
            <option value="file" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">File</option>
            <option value="log" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">Log</option>
          </select>

          <input
            type="text"
            placeholder="IP address"
            value={ipAddress}
            onChange={handleFilterChange(setIpAddress)}
            className={filterFieldClasses}
          />

          <input
            type="date"
            value={date}
            onChange={handleFilterChange(setDate)}
            className={`${filterFieldClasses} rounded-r-full`}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => setSelectedAlert(alert)}
                className="block w-full text-left"
              >
                <AlertCard alert={alert} />
              </button>
            ))}
            {alerts.length === 0 && (
              <p className="text-gray-400 dark:text-gray-500">No alerts match these filters.</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={alerts.length < PAGE_SIZE}
            onClick={() => setSkip(skip + PAGE_SIZE)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            Next
          </button>
        </div>
      </main>

      <AlertModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onResolve={handleResolve}
        onDelete={handleDelete}
      />
    </div>
  )
}

export default Alerts
