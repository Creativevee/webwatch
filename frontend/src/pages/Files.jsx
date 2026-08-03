import { useEffect, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'

function Files() {
  const [folders, setFolders] = useState([])

  useEffect(() => {
    async function fetchFolders() {
      const res = await client.get('/api/folders')
      setFolders(res.data)
    }
    fetchFolders()
  }, [])

  async function handleDelete(folderId) {
    await client.delete(`/api/folders/${folderId}`)
    setFolders(folders.filter((folder) => folder.id !== folderId))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6">


        <div className="mt-4 flex flex-col gap-3">
          {folders.map((folder) => (
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

          {folders.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500">No folders are being watched yet.</p>
          )}
        </div>
      </main>
    </div>
  )
}

export default Files
