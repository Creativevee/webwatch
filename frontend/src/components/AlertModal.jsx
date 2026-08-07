import { useState } from 'react'
import { Sparkles } from 'lucide-react'

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

function getAbuseScoreColor(score) {
  if (score >= 50) return 'var(--status-critical)'
  if (score >= 25) return 'var(--status-warning)'
  return 'var(--status-good)'
}

function tabClasses(isActive) {
  return isActive
    ? 'rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-900 shadow dark:bg-gray-950 dark:text-gray-100'
    : 'rounded-full px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  )
}

function AlertModal({ alert, onClose, onResolve, onDelete }) {
  const [tab, setTab] = useState('details')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!alert) return null

  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium
  const createdAt = new Date(alert.created_at)
  const hasAbuseScore = alert.abuseipdb_score !== null && alert.abuseipdb_score !== undefined

  async function handleResolveClick(nextResolvedState) {
    setIsSubmitting(true)
    try {
      await onResolve(alert.id, nextResolvedState)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteClick() {
    if (!window.confirm('Delete this alert permanently? This cannot be undone.')) return

    setIsSubmitting(true)
    try {
      await onDelete(alert.id)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
              style={{ backgroundColor: style.accent, color: style.text }}
            >
              {alert.severity}
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {getEntityLabel(alert)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex w-fit items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
          <button type="button" onClick={() => setTab('details')} className={tabClasses(tab === 'details')}>
            Details
          </button>
          <button
            type="button"
            onClick={() => setTab('narrator')}
            className={`${tabClasses(tab === 'narrator')} flex items-center gap-1`}
          >
            <Sparkles size={14} />
            Threat narrator
          </button>
        </div>

        {tab === 'details' && (
          <div className="mt-4 space-y-1">
            <DetailRow label="Entity" value={getEntityLabel(alert)} />
            <DetailRow label="Category" value={getCategoryLabel(alert)} />
            <DetailRow label="IP address" value={alert.ip_address || '-'} />
            <DetailRow label="Date" value={createdAt.toLocaleDateString()} />
            <DetailRow label="Time" value={createdAt.toLocaleTimeString()} />
            <DetailRow label="Severity" value={alert.severity} />

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">MITRE technique</span>
              {alert.mitre_technique ? (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {alert.mitre_technique}
                </span>
              ) : (
                <span className="font-medium text-gray-900 dark:text-gray-100">-</span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">AbuseIPDB score</span>
              {hasAbuseScore ? (
                <span className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getAbuseScoreColor(alert.abuseipdb_score) }}
                  ></span>
                  {alert.abuseipdb_score}
                </span>
              ) : (
                <span className="font-medium text-gray-900 dark:text-gray-100">-</span>
              )}
            </div>

            <DetailRow label="Status" value={alert.is_resolved ? 'Resolved' : 'Unresolved'} />
          </div>
        )}

        {tab === 'narrator' && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
              <Sparkles size={14} />
              AI insight
            </p>
            <div
              className="max-h-56 overflow-y-auto rounded-lg bg-gray-100 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              style={{ borderLeft: '3px solid var(--accent)' }}
            >
              {alert.ai_explanation || 'No AI explanation available for this alert.'}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {alert.is_resolved ? (
            <button
              disabled={isSubmitting}
              onClick={() => handleResolveClick(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Mark unresolved
            </button>
          ) : (
            <button
              disabled={isSubmitting}
              onClick={() => handleResolveClick(true)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Mark resolved
            </button>
          )}
          <button
            disabled={isSubmitting}
            onClick={handleDeleteClick}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default AlertModal
