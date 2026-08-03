const SEVERITY_STYLES = {
  high: { accent: 'var(--status-critical)', text: '#ffffff' },
  medium: { accent: 'var(--status-warning)', text: '#1a1a19' },
  low: { accent: 'var(--status-good)', text: '#ffffff' },
}

function getEntityLabel(alert) {
  if (alert.rule_name) return alert.rule_name

  const fileEventMatch = alert.message.match(/^\[(\w+)\]/)
  if (fileEventMatch) return `File ${fileEventMatch[1].toLowerCase()}`

  return 'Unknown'
}

function getCategoryLabel(alert) {
  return alert.log_source_id ? 'Log' : 'File'
}

function timeAgo(dateString) {
  const seconds = Math.round((Date.now() - new Date(dateString).getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (seconds < 60) return rtf.format(-seconds, 'second')
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  return rtf.format(-days, 'day')
}

function RecentAlertsTable({ alerts }) {
  const topAlerts = alerts.slice(0, 4)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent alerts</p>

      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-gray-400 dark:text-gray-500">
          <tr>
            <th className="pb-2 font-normal">Entity</th>
            <th className="pb-2 font-normal">Category</th>
            <th className="pb-2 font-normal">Alert severity</th>
            <th className="pb-2 font-normal">Time</th>
          </tr>
        </thead>
        <tbody>
          {topAlerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium
            return (
              <tr key={alert.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-2 text-gray-900 dark:text-gray-100">{getEntityLabel(alert)}</td>
                <td className="py-2 text-gray-500 dark:text-gray-400">{getCategoryLabel(alert)}</td>
                <td className="py-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                    style={{ backgroundColor: style.accent, color: style.text }}
                  >
                    {alert.severity}
                  </span>
                </td>
                <td className="py-2 text-gray-500 dark:text-gray-400">{timeAgo(alert.created_at)}</td>
              </tr>
            )
          })}
          {topAlerts.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-400 dark:text-gray-500">
                No alerts yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default RecentAlertsTable
