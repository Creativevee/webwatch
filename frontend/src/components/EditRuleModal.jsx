import { useState } from 'react'

const inputClasses =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--accent)] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  return fallback
}

function EditRuleModal({ rule, onClose, onSave }) {
  const [name, setName] = useState(rule.name)
  const [pattern, setPattern] = useState(rule.pattern)
  const [severity, setSeverity] = useState(rule.severity)
  const [mitreTechnique, setMitreTechnique] = useState(rule.mitre_technique || '')
  const [description, setDescription] = useState(rule.description || '')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setIsSaving(true)
    try {
      await onSave(rule.id, {
        name,
        pattern,
        severity,
        mitre_technique: mitreTechnique || null,
        description: description || null,
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not save rule'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit rule</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="rule-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              id="rule-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="rule-pattern" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pattern
            </label>
            <input
              id="rule-pattern"
              type="text"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              required
              className={`${inputClasses} font-mono`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="rule-severity" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Severity
            </label>
            <select
              id="rule-severity"
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
            <label htmlFor="rule-mitre" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              MITRE technique
            </label>
            <input
              id="rule-mitre"
              type="text"
              value={mitreTechnique}
              onChange={(event) => setMitreTechnique(event.target.value)}
              className={`${inputClasses} font-mono`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="rule-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="rule-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className={inputClasses}
            />
          </div>
        </div>

        {errorMessage && (
          <p className="mt-3 text-sm" style={{ color: 'var(--status-critical)' }}>
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditRuleModal
