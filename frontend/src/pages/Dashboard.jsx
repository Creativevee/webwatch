import { useEffect, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import OverviewCard from '../components/OverviewCard'
import SeverityLegend from '../components/SeverityLegend'
import AlertsPerHourChart from '../components/AlertsPerHourChart'
import AlertsByCategoryChart from '../components/AlertsByCategoryChart'
import RecentAlertsTable from '../components/RecentAlertsTable'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [recentAlerts, setRecentAlerts] = useState([])
  const [chartAlerts, setChartAlerts] = useState([])

  useEffect(() => {
    async function fetchUser() {
      const res = await client.get('/api/auth/me')
      setUser(res.data)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    async function fetchStats() {
      const res = await client.get('/api/stats')
      setStats(res.data)
    }
    fetchStats()
  }, [])

  useEffect(() => {
    async function fetchRecentAlerts() {
      const res = await client.get('/api/alerts', { params: { limit: 4 } })
      setRecentAlerts(res.data)
    }
    fetchRecentAlerts()
  }, [])

  useEffect(() => {
    async function fetchChartAlerts() {
      const res = await client.get('/api/alerts', { params: { limit: 200 } })
      setChartAlerts(res.data)
    }
    fetchChartAlerts()
  }, [])

  const maxRiskScore = stats
    ? Math.max(...stats.top_risk_ips.map((ip) => ip.risk_score), 1)
    : 1

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

        {!stats && (
          <p className="mt-6 text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        )}

        {stats && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <OverviewCard stats={stats} />
              <AlertsPerHourChart alerts={chartAlerts} />
              <AlertsByCategoryChart alerts={chartAlerts} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecentAlertsTable alerts={recentAlerts} />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Top risk IPs</p>
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-gray-400 dark:text-gray-500">
                    <tr>
                      <th className="pb-2 font-normal">IP address</th>
                      <th className="pb-2 font-normal">Risk score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_risk_ips.map((ip) => {
                      const percent = Math.round((ip.risk_score / maxRiskScore) * 100)
                      return (
                        <tr key={ip.ip_address} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="py-2 text-gray-900 dark:text-gray-100">{ip.ip_address}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{ width: `${percent}%`, backgroundColor: 'var(--status-critical)' }}
                                />
                              </div>
                              <span className="text-gray-900 dark:text-gray-100">{ip.risk_score}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {stats.top_risk_ips.length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-gray-400 dark:text-gray-500">
                          No IPs tracked yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Dashboard
