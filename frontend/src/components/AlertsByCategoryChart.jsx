import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function groupAlertsByCategory(alerts) {
  let fileCount = 0
  let logCount = 0

  alerts.forEach((alert) => {
    if (alert.log_source_id) {
      logCount += 1
    } else {
      fileCount += 1
    }
  })

  return [
    { category: 'File', count: fileCount },
    { category: 'Log', count: logCount },
  ]
}

function AlertsByCategoryChart({ alerts }) {
  const data = groupAlertsByCategory(alerts)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Alerts by category</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} stroke="var(--text)" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--text)" />
          <Tooltip
            contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-h)' }}
          />
          <Bar dataKey="count" name="Alerts" fill="var(--chart-accent)" radius={[4, 4, 0, 0]} barSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default AlertsByCategoryChart
