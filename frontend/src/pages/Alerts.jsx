import { useEffect, useRef, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import RecentAlertsTable from '../components/RecentAlertsTable'
import AlertModal from '../components/AlertModal'
import useAlertSocket from '../hooks/useAlertSocket'
import useTicker from '../hooks/useTicker'

const PAGE_SIZE = 20

const filterFieldClasses =
  'bg-transparent px-4 py-2 text-sm text-gray-900 focus:outline-none dark:text-gray-100'

function matchesFilters(alert, { severity, category, ipAddress, date }) {
  if (severity && alert.severity !== severity) return false
  if (category === 'file' && alert.log_source_id) return false
  if (category === 'log' && !alert.log_source_id) return false
  if (ipAddress && alert.ip_address !== ipAddress) return false
  if (date && !alert.created_at.startsWith(date)) return false
  return true
}

// an alert broadcasts twice - once immediately, once again after AbuseIPDB/AI
// enrichment finishes - so an id already in the list means "update it in
// place", not "add a second copy"
function upsertAlert(prev, alert) {
  const exists = prev.some((a) => a.id === alert.id)
  if (exists) {
    return prev.map((a) => (a.id === alert.id ? alert : a))
  }
  return [alert, ...prev]
}

function Alerts() {
  useTicker()
  const [severity, setSeverity] = useState('')
  const [category, setCategory] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [date, setDate] = useState('')
  const [skip, setSkip] = useState(0)

  const [alerts, setAlerts] = useState([])
  const [alertsLoaded, setAlertsLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const liveAlertIdsRef = useRef(new Set())

  useEffect(() => {
    async function fetchAlerts() {
      try {
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
      } catch (error) {
        setErrorMessage('Could not load alerts')
      } finally {
        setAlertsLoaded(true)
      }
    }
    fetchAlerts()
  }, [severity, category, ipAddress, date, skip])

  function handleFilterChange(setter) {
    return (event) => {
      setSkip(0)
      setter(event.target.value)
    }
  }

  function handleClearFilters() {
    setSeverity('')
    setCategory('')
    setIpAddress('')
    setDate('')
    setSkip(0)
  }

  function handleNewAlert(alert) {
    if (skip !== 0) return
    if (!matchesFilters(alert, { severity, category, ipAddress, date })) return
    setAlerts((prev) => {
      const isNewRow = !prev.some((a) => a.id === alert.id)
      if (isNewRow) liveAlertIdsRef.current.add(alert.id)
      return upsertAlert(prev, alert)
    })
  }

  useAlertSocket(handleNewAlert)

  async function handleResolve(alertId, isResolved) {
    try {
      await client.put(`/api/alerts/${alertId}`, { is_resolved: isResolved })
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, is_resolved: isResolved } : a)))
      setSelectedAlert(null)
    } catch (error) {
      setErrorMessage('Could not update alert')
    }
  }

  async function handleDelete(alertId) {
    try {
      await client.delete(`/api/alerts/${alertId}`)
      setAlerts(alerts.filter((a) => a.id !== alertId))
      setSelectedAlert(null)
    } catch (error) {
      setErrorMessage('Could not delete alert')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6">

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex w-fit flex-wrap divide-x divide-gray-200 rounded-full border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
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

          <button
            type="button"
            onClick={handleClearFilters}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Clear filters
          </button>
        </div>

        {errorMessage && (
          <p className="mt-2 text-sm" style={{ color: 'var(--status-critical)' }}>
            {errorMessage}
          </p>
        )}

        {!alertsLoaded && (
          <p className="mt-4 text-gray-400 dark:text-gray-500">Loading alerts...</p>
        )}

        {alertsLoaded && (
          <div className="mt-4">
            <RecentAlertsTable
              alerts={alerts}
              onSelectAlert={setSelectedAlert}
              newAlertIds={liveAlertIdsRef.current}
              title={null}
            />
          </div>
        )}

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
