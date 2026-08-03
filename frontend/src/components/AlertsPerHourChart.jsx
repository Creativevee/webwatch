import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function groupAlertsByHour(alerts) {
  const counts = {}

  alerts.forEach((alert) => {
    const hourStart = new Date(alert.created_at)
    hourStart.setMinutes(0, 0, 0)
    const key = hourStart.toISOString()
    counts[key] = (counts[key] || 0) + 1
  })

  return Object.keys(counts)
    .sort()
    .map((key) => ({
      hour: new Date(key).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', hour12: false }),
      count: counts[key],
    }))
}

function AlertsPerHourChart({ alerts }) {
  const data = groupAlertsByHour(alerts)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Detection volume trend</p>

      {data.length === 0 && (
        <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">No data yet.</p>
      )}

      {data.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="var(--text)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--text)" />
            <Tooltip
              contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-h)' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Alerts"
              stroke="var(--chart-accent)"
              strokeWidth={2}
              fill="var(--chart-accent)"
              fillOpacity={0.1}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default AlertsPerHourChart
