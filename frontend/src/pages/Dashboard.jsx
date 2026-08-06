import { useEffect, useRef, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import OverviewCard from '../components/OverviewCard'
import SeverityLegend from '../components/SeverityLegend'
import AlertsPerHourChart from '../components/AlertsPerHourChart'
import AlertsByCategoryChart from '../components/AlertsByCategoryChart'
import RecentAlertsTable from '../components/RecentAlertsTable'
import TopRiskIpsTable from '../components/TopRiskIpsTable'
import AlertModal from '../components/AlertModal'
import useAlertSocket from '../hooks/useAlertSocket'

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

function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [recentAlerts, setRecentAlerts] = useState([])
  const [recentAlertsLoaded, setRecentAlertsLoaded] = useState(false)

  const [chartAlerts, setChartAlerts] = useState([])
  const [chartAlertsLoaded, setChartAlertsLoaded] = useState(false)

  const [selectedAlert, setSelectedAlert] = useState(null)
  const countedAlertIdsRef = useRef(new Set())
  const liveAlertIdsRef = useRef(new Set())

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await client.get('/api/auth/me')
        setUser(res.data)
      } catch (error) {
        setErrorMessage('Could not load your account details')
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await client.get('/api/stats')
        setStats(res.data)
      } catch (error) {
        setErrorMessage('Could not load dashboard stats')
      }
    }
    fetchStats()
  }, [])

  useEffect(() => {
    async function fetchRecentAlerts() {
      try {
        const res = await client.get('/api/alerts', { params: { limit: 4 } })
        setRecentAlerts(res.data)
      } catch (error) {
        setErrorMessage('Could not load recent alerts')
      } finally {
        setRecentAlertsLoaded(true)
      }
    }
    fetchRecentAlerts()
  }, [])

  useEffect(() => {
    async function fetchChartAlerts() {
      try {
        const res = await client.get('/api/alerts', { params: { limit: 200 } })
        setChartAlerts(res.data)
      } catch (error) {
        setErrorMessage('Could not load chart data')
      } finally {
        setChartAlertsLoaded(true)
      }
    }
    fetchChartAlerts()
  }, [])

  function handleNewAlert(alert) {
    setRecentAlerts((prev) => {
      const isNewRow = !prev.some((a) => a.id === alert.id)
      if (isNewRow) liveAlertIdsRef.current.add(alert.id)
      return upsertAlert(prev, alert)
    })
    setChartAlerts((prev) => upsertAlert(prev, alert))

    // the enrichment re-broadcast reuses the same alert id - only bump the
    // counters the first time we see that id, not on every re-broadcast
    if (countedAlertIdsRef.current.has(alert.id)) return
    countedAlertIdsRef.current.add(alert.id)

    setStats((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        total_alerts: prev.total_alerts + 1,
        unresolved_alerts: prev.unresolved_alerts + 1,
        alerts_last_24h: prev.alerts_last_24h + 1,
        alerts_by_severity: {
          ...prev.alerts_by_severity,
          [alert.severity]: (prev.alerts_by_severity[alert.severity] || 0) + 1,
        },
      }
    })
  }

  useAlertSocket(handleNewAlert)

  async function handleResolve(alertId, isResolved) {
    try {
      await client.put(`/api/alerts/${alertId}`, { is_resolved: isResolved })
      setRecentAlerts(recentAlerts.map((a) => (a.id === alertId ? { ...a, is_resolved: isResolved } : a)))
      setSelectedAlert(null)
    } catch (error) {
      setErrorMessage('Could not update alert')
    }
  }

  async function handleDelete(alertId) {
    try {
      await client.delete(`/api/alerts/${alertId}`)
      setRecentAlerts(recentAlerts.filter((a) => a.id !== alertId))
      setSelectedAlert(null)
    } catch (error) {
      setErrorMessage('Could not delete alert')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.username || '...'}
          </h2>
          {stats && <SeverityLegend counts={stats.alerts_by_severity} />}
        </div>

        {errorMessage && (
          <p className="mt-2 text-sm" style={{ color: 'var(--status-critical)' }}>
            {errorMessage}
          </p>
        )}

        {!stats && (
          <p className="mt-6 text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        )}

        {stats && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <OverviewCard stats={stats} />

              {chartAlertsLoaded ? (
                <AlertsPerHourChart alerts={chartAlerts} />
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-sm text-gray-400 dark:text-gray-500">Loading chart...</p>
                </div>
              )}

              {chartAlertsLoaded ? (
                <AlertsByCategoryChart alerts={chartAlerts} />
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-sm text-gray-400 dark:text-gray-500">Loading chart...</p>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {recentAlertsLoaded ? (
                  <RecentAlertsTable
                    alerts={recentAlerts}
                    onSelectAlert={setSelectedAlert}
                    newAlertIds={liveAlertIdsRef.current}
                    limit={5}
                  />
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-sm text-gray-400 dark:text-gray-500">Loading recent alerts...</p>
                  </div>
                )}
              </div>

              <TopRiskIpsTable ips={stats.top_risk_ips} />
            </div>
          </>
        )}
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

export default Dashboard
