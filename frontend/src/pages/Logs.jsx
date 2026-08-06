import { useEffect, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import LiveLogTerminal from '../components/LiveLogTerminal'

const inputClasses =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--accent)] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

function Logs() {
  const [logSources, setLogSources] = useState([])
  const [logSourcesLoaded, setLogSourcesLoaded] = useState(false)
  const [folders, setFolders] = useState([])

  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [sourceType, setSourceType] = useState('custom')
  const [folderId, setFolderId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [streamingSource, setStreamingSource] = useState(null)

  useEffect(() => {
    async function fetchLogSources() {
      const res = await client.get('/api/logs')
      setLogSources(res.data)
      setLogSourcesLoaded(true)
    }
    fetchLogSources()
  }, [])

  useEffect(() => {
    async function fetchFolders() {
      const res = await client.get('/api/folders')
      setFolders(res.data)
    }
    fetchFolders()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    try {
      const res = await client.post('/api/logs', {
        name,
        path,
        source_type: sourceType,
        folder_id: folderId ? Number(folderId) : null,
      })
      setLogSources([...logSources, res.data])
      setName('')
      setPath('')
      setSourceType('custom')
      setFolderId('')
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Could not add log source')
    }
  }

  async function handleDelete(logId) {
    if (!window.confirm('Remove this log source from monitoring? This cannot be undone.')) return

    setActionError('')
    try {
      await client.delete(`/api/logs/${logId}`)
      setLogSources(logSources.filter((logSource) => logSource.id !== logId))
    } catch (error) {
      setActionError(error.response?.data?.detail || 'Could not remove log source')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Log sources</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end justify-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="log-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              id="log-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="log-path" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Path
            </label>
            <input
              id="log-path"
              type="text"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              required
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="log-source-type" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Source type
            </label>
            <input
              id="log-source-type"
              type="text"
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
              required
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="log-folder" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Folder
            </label>
            <select
              id="log-folder"
              value={folderId}
              onChange={(event) => setFolderId(event.target.value)}
              className={inputClasses}
            >
              <option value="" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">None</option>
              {folders.map((folder) => (
                <option
                  key={folder.id}
                  value={folder.id}
                  className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                >
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add log source
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
          {!logSourcesLoaded && (
            <p className="text-gray-400 dark:text-gray-500">Loading log sources...</p>
          )}

          {logSourcesLoaded && logSources.map((logSource) => (
            <div
              key={logSource.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-gray-900 dark:text-gray-100">{logSource.name}</span>
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{logSource.path}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {logSource.source_type}
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  Added {new Date(logSource.created_at).toLocaleDateString()}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                  style={{
                    backgroundColor: logSource.is_active ? 'var(--status-good)' : 'var(--status-critical)',
                    color: '#ffffff',
                  }}
                >
                  {logSource.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => setStreamingSource(logSource)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  View live stream
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(logSource.id)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {logSourcesLoaded && logSources.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500">No log sources are being watched yet.</p>
          )}
        </div>

        {streamingSource && (
          <div className="mt-4">
            <LiveLogTerminal
              logSourceId={streamingSource.id}
              logSourceName={streamingSource.name}
              onClose={() => setStreamingSource(null)}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default Logs
