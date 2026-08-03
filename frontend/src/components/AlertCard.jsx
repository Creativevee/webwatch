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

function getSourcePath(alert) {
  const match = alert.message.match(/^\[\w+\]\s*(.+)$/)
  return match ? match[1] : alert.message
}

function getAbuseScoreColor(score) {
  if (score >= 50) return 'var(--status-critical)'
  if (score >= 25) return 'var(--status-warning)'
  return 'var(--status-good)'
}

function AlertCard({ alert }) {
  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium
  const isLogAlert = Boolean(alert.log_source_id)
  const hasAbuseScore = alert.abuseipdb_score !== null && alert.abuseipdb_score !== undefined

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      style={{ borderLeft: `4px solid ${style.accent}` }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
          style={{ backgroundColor: style.accent, color: style.text }}
        >
          {alert.severity}
        </span>

        <span className="font-medium text-gray-900 dark:text-gray-100">
          {getEntityLabel(alert)}
        </span>

        {!isLogAlert && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Source: {getSourcePath(alert)}
          </span>
        )}

        {isLogAlert && (
          <>
            {alert.mitre_technique && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {alert.mitre_technique}
              </span>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              IP address: {alert.ip_address || '-'}
            </span>
            {hasAbuseScore && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getAbuseScoreColor(alert.abuseipdb_score) }}
                ></span>
                AbuseIPDB {alert.abuseipdb_score}
              </span>
            )}
          </>
        )}

        {alert.is_resolved && (
          <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            Resolved
          </span>
        )}
      </div>
    </div>
  )
}

export default AlertCard
