import { useEffect, useRef, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import useAlertSocket from '../hooks/useAlertSocket'
import useTicker from '../hooks/useTicker'

const PAGE_SIZE = 10

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

const inputClasses =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--accent)] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

const SEVERITY_STYLES = {
  high: { accent: 'var(--status-critical)', text: '#ffffff' },
  medium: { accent: 'var(--status-warning)', text: '#1a1a19' },
  low: { accent: 'var(--status-good)', text: '#ffffff' },
}

function getFileEvent(alert) {
  const match = alert.message.match(/^\[(\w+)\]/)
  return match ? match[1] : 'UNKNOWN'
}

function getFilePath(alert) {
  const match = alert.message.match(/^\[\w+\]\s*(.+)$/)
  return match ? match[1] : alert.message
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

function formatAlertTime(dateString) {
  const timePart = new Date(dateString)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    .replace(/\s/g, '')
    .toLowerCase()
  return `${timePart} ${timeAgo(dateString)}`
}

function Files() {
  useTicker()
  const [folders, setFolders] = useState([])
  const [foldersLoaded, setFoldersLoaded] = useState(false)
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const [fileChanges, setFileChanges] = useState([])
  const [fileChangesLoaded, setFileChangesLoaded] = useState(false)
  const [fileChangesSkip, setFileChangesSkip] = useState(0)

  const [rebuildMessages, setRebuildMessages] = useState({})
  const liveAlertIdsRef = useRef(new Set())

  useEffect(() => {
    async function fetchFolders() {
      const res = await client.get('/api/folders')
      setFolders(res.data)
      setFoldersLoaded(true)
    }
    fetchFolders()
  }, [])

  useEffect(() => {
    async function fetchFileChanges() {
      const res = await client.get('/api/alerts', {
        params: { category: 'file', skip: fileChangesSkip, limit: PAGE_SIZE },
      })
      setFileChanges(res.data)
      setFileChangesLoaded(true)
    }
    fetchFileChanges()
  }, [fileChangesSkip])

  function handleNewAlert(alert) {
    if (fileChangesSkip !== 0) return
    if (alert.log_source_id) return
    setFileChanges((prev) => {
      const isNewRow = !prev.some((a) => a.id === alert.id)
      if (isNewRow) liveAlertIdsRef.current.add(alert.id)
      return upsertAlert(prev, alert)
    })
  }

  useAlertSocket(handleNewAlert)

  async function handleDelete(folderId) {
    if (!window.confirm('Remove this folder from monitoring? This cannot be undone.')) return

    setActionError('')
    try {
      await client.delete(`/api/folders/${folderId}`)
      setFolders(folders.filter((folder) => folder.id !== folderId))
    } catch (error) {
      setActionError(error.response?.data?.detail || 'Could not remove folder')
    }
  }

  async function handleRebuild(folderId) {
    if (!window.confirm('Rebuild the baseline for this folder? The current files will become the new "known good" state.')) return

    setActionError('')
    try {
      const res = await client.post(`/api/folders/${folderId}/rebuild`)
      setRebuildMessages({ ...rebuildMessages, [folderId]: `Rebuilt (${res.data.files_scanned} files)` })

      setTimeout(() => {
        setRebuildMessages((current) => {
          const { [folderId]: removed, ...rest } = current
          return rest
        })
      }, 3000)
    } catch (error) {
      setActionError(error.response?.data?.detail || 'Could not rebuild baseline')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    try {
      const res = await client.post('/api/folders', { name, path })
      setFolders([...folders, res.data])
      setName('')
      setPath('')
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Could not add folder')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6">

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end justify-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="folder-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="folder-path" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Path
            </label>
            <input
              id="folder-path"
              type="text"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              required
              className={inputClasses}
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add folder
          </button>

          {errorMessage && (
            <p className="text-sm" style={{ color: 'var(--status-critical)' }}>
              {errorMessage}
            </p>
          )}
        </form>

        <h3 className="mt-8 text-lg font-semibold text-gray-900 dark:text-gray-100">Watched folders</h3>

        {actionError && (
          <p className="mt-2 text-sm" style={{ color: 'var(--status-critical)' }}>
            {actionError}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {!foldersLoaded && (
            <p className="text-gray-400 dark:text-gray-500">Loading folders...</p>
          )}

          {foldersLoaded && folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-gray-900 dark:text-gray-100">{folder.name}</span>
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{folder.path}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  Added {new Date(folder.created_at).toLocaleDateString()}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                  style={{
                    backgroundColor: folder.is_active ? 'var(--status-good)' : 'var(--status-critical)',
                    color: '#ffffff',
                  }}
                >
                  {folder.is_active ? 'Active' : 'Inactive'}
                </span>
                {rebuildMessages[folder.id] && (
                  <span className="text-sm" style={{ color: 'var(--status-good)' }}>
                    {rebuildMessages[folder.id]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRebuild(folder.id)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Rebuild baseline
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(folder.id)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {foldersLoaded && folders.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500">No folders are being watched yet.</p>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent file changes</p>

          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-gray-400 dark:text-gray-500">
              <tr>
                <th className="pb-2 pr-4 font-normal">Id</th>
                <th className="pb-2 pr-4 font-normal">Event</th>
                <th className="pb-2 pr-4 font-normal">Path</th>
                <th className="pb-2 pr-4 font-normal">Severity</th>
                <th className="pb-2 font-normal">Time</th>
              </tr>
            </thead>
            <tbody>
              {!fileChangesLoaded && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-400 dark:text-gray-500">
                    Loading file changes...
                  </td>
                </tr>
              )}

              {fileChangesLoaded && fileChanges.map((alert) => {
                const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium
                return (
                  <tr
                    key={alert.id}
                    className={`border-t border-gray-100 dark:border-gray-800 ${
                      liveAlertIdsRef.current.has(alert.id) ? 'alert-enter' : ''
                    }`}
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-gray-400 dark:text-gray-500">{alert.id}</td>
                    <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{getFileEvent(alert)}</td>
                    <td className="py-2 pr-4 font-mono text-gray-500 dark:text-gray-400">{getFilePath(alert)}</td>
                    <td className="py-2 pr-4">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                        style={{ backgroundColor: style.accent, color: style.text }}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{formatAlertTime(alert.created_at)}</td>
                  </tr>
                )
              })}

              {fileChangesLoaded && fileChanges.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-400 dark:text-gray-500">
                    No file changes recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              disabled={fileChangesSkip === 0}
              onClick={() => setFileChangesSkip(Math.max(0, fileChangesSkip - PAGE_SIZE))}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={fileChanges.length < PAGE_SIZE}
              onClick={() => setFileChangesSkip(fileChangesSkip + PAGE_SIZE)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Files
