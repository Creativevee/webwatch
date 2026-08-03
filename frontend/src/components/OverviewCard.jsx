function OverviewCard({ stats }) {
  const rows = [
    { label: 'Total alerts', value: stats.total_alerts },
    { label: 'Unresolved', value: stats.unresolved_alerts },
    { label: 'High severity', value: stats.alerts_by_severity.high || 0 },
    { label: 'Alerts (last 24h)', value: stats.alerts_last_24h },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Alert Overview </p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between py-1.5">
          <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

export default OverviewCard
