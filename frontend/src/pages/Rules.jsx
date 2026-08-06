import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import EditRuleModal from '../components/EditRuleModal'

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  return fallback
}

const inputClasses =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--accent)] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

const SEVERITY_STYLES = {
  high: { accent: 'var(--status-critical)', text: '#ffffff' },
  medium: { accent: 'var(--status-warning)', text: '#1a1a19' },
  low: { accent: 'var(--status-good)', text: '#ffffff' },
}

function Rules() {
  const [rules, setRules] = useState([])
  const [rulesLoaded, setRulesLoaded] = useState(false)
  const [actionError, setActionError] = useState('')
  const [editingRule, setEditingRule] = useState(null)

  const [name, setName] = useState('')
  const [pattern, setPattern] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [mitreTechnique, setMitreTechnique] = useState('')
  const [description, setDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function fetchRules() {
      try {
        const res = await client.get('/api/rules')
        setRules(res.data)
      } catch (error) {
        setActionError('Could not load rules')
      } finally {
        setRulesLoaded(true)
      }
    }
    fetchRules()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    try {
      const res = await client.post('/api/rules', {
        name,
        pattern,
        severity,
        mitre_technique: mitreTechnique || null,
        description: description || null,
      })
      setRules([...rules, res.data])
      setName('')
      setPattern('')
      setSeverity('medium')
      setMitreTechnique('')
      setDescription('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not create rule'))
    }
  }

  async function handleToggleActive(rule) {
    if (rule.is_active) {
      const confirmed = window.confirm(
        `Disable "${rule.name}"? It will stop detecting matching activity until re-enabled.`
      )
      if (!confirmed) return
    }

    setActionError('')
    try {
      const res = await client.put(`/api/rules/${rule.id}`, { is_active: !rule.is_active })
      setRules(rules.map((r) => (r.id === rule.id ? res.data : r)))
    } catch (error) {
      setActionError(getErrorMessage(error, 'Could not update rule'))
    }
  }

  async function handleDelete(ruleId) {
    if (!window.confirm('Delete this rule permanently? This cannot be undone.')) return

    setActionError('')
    try {
      await client.delete(`/api/rules/${ruleId}`)
      setRules(rules.filter((r) => r.id !== ruleId))
    } catch (error) {
      setActionError(getErrorMessage(error, 'Could not delete rule'))
    }
  }

  async function handleSaveEdit(ruleId, updates) {
    const res = await client.put(`/api/rules/${ruleId}`, updates)
    setRules(rules.map((r) => (r.id === ruleId ? res.data : r)))
    setEditingRule(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Rules</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end justify-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="new-rule-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              id="new-rule-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-rule-pattern" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pattern
            </label>
            <input
              id="new-rule-pattern"
              type="text"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              required
              className={`${inputClasses} font-mono`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-rule-severity" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Severity
            </label>
            <select
              id="new-rule-severity"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              className={inputClasses}
            >
              <option value="low" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">Low</option>
              <option value="medium" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">Medium</option>
              <option value="high" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">High</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-rule-mitre" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              MITRE technique
            </label>
            <input
              id="new-rule-mitre"
              type="text"
              value={mitreTechnique}
              onChange={(event) => setMitreTechnique(event.target.value)}
              className={`${inputClasses} font-mono`}
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add rule
          </button>

          {errorMessage && (
            <p className="text-sm" style={{ color: 'var(--status-critical)' }}>
              {errorMessage}
            </p>
          )}
        </form>

        {actionError && (
          <p className="mt-2 text-sm" style={{ color: 'var(--status-critical)' }}>
            {actionError}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {!rulesLoaded && (
            <p className="text-gray-400 dark:text-gray-500">Loading rules...</p>
          )}

          {rulesLoaded && rules.map((rule) => {
            const style = SEVERITY_STYLES[rule.severity] || SEVERITY_STYLES.medium
            return (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                      style={{ backgroundColor: style.accent, color: style.text }}
                    >
                      {rule.severity}
                    </span>
                    {rule.mitre_technique && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {rule.mitre_technique}
                      </span>
                    )}
                  </div>
                  {rule.description && (
                    <span className="text-sm text-gray-400 dark:text-gray-500">{rule.description}</span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingRule(rule)}
                    title="Edit rule"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(rule.id)}
                    title="Delete rule"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    <Trash2 size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(rule)}
                    className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                    style={{ backgroundColor: rule.is_active ? 'var(--status-good)' : '#d1d5db' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: rule.is_active ? 'translateX(1.25rem)' : 'translateX(0)' }}
                    />
                  </button>
                </div>
              </div>
            )
          })}

          {rulesLoaded && rules.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500">No rules configured yet.</p>
          )}
        </div>
      </main>

      {editingRule && (
        <EditRuleModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}

export default Rules
