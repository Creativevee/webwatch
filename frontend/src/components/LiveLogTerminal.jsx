import { useEffect, useRef, useState } from 'react'
import client from '../api/client'
import useAlertSocket from '../hooks/useAlertSocket'

const POLL_INTERVAL_MS = 3000

function lineTriggeredAlert(line, alertMessages) {
  const trimmedLine = line.trim()
  if (!trimmedLine) return false

  return alertMessages.some((message) => message.includes(trimmedLine))
}

function LiveLogTerminal({ logSourceId, logSourceName, onClose }) {
  const [lines, setLines] = useState([])
  const [alertMessages, setAlertMessages] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const bottomRef = useRef(null)

  // raw log content has no live-push channel - this still has to poll the file
  useEffect(() => {
    let isActive = true

    async function fetchTail() {
      try {
        const tailRes = await client.get(`/api/logs/${logSourceId}/tail`, { params: { lines: 100 } })
        if (!isActive) return
        setLines(tailRes.data.lines)
        setErrorMessage('')
      } catch (error) {
        if (isActive) setErrorMessage(error.response?.data?.detail || 'Could not read log file')
      }
    }

    fetchTail()
    const interval = setInterval(fetchTail, POLL_INTERVAL_MS)

    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [logSourceId])

  // one-time fetch for pre-existing alert history, so highlighting works on the
  // lines already visible when this terminal first opens
  useEffect(() => {
    let isActive = true

    async function fetchAlertHistory() {
      try {
        const alertsRes = await client.get('/api/alerts', { params: { category: 'log', limit: 200 } })
        if (!isActive) return
        const sourceAlerts = alertsRes.data.filter((alert) => alert.log_source_id === logSourceId)
        setAlertMessages(sourceAlerts.map((alert) => alert.message))
      } catch (error) {
        // highlighting is a bonus on top of the raw stream; don't surface an error just for this
      }
    }

    fetchAlertHistory()

    return () => {
      isActive = false
    }
  }, [logSourceId])

  // anything new after that comes live, instead of waiting on the next poll
  function handleNewAlert(alert) {
    if (alert.log_source_id !== logSourceId) return
    setAlertMessages((prev) => [...prev, alert.message])
  }

  useAlertSocket(handleNewAlert)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="rounded-2xl border border-gray-800 bg-black p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-mono text-sm text-gray-400">tail -f {logSourceName}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-gray-400 hover:bg-gray-900 hover:text-gray-200"
        >
          Close
        </button>
      </div>

      {errorMessage && (
        <p className="mt-2 font-mono text-sm" style={{ color: 'var(--status-critical)' }}>
          {errorMessage}
        </p>
      )}

      <div className="mt-3 h-72 space-y-1.5 overflow-auto font-mono text-sm text-green-400">
        {lines.map((line, index) => {
          const isAlertLine = lineTriggeredAlert(line, alertMessages)
          return (
            <p
              key={index}
              className="whitespace-pre"
              style={isAlertLine ? { color: 'var(--status-critical)' } : undefined}
            >
              {line.trimStart()}
            </p>
          )
        })}
        {lines.length === 0 && !errorMessage && <p className="text-gray-600">Waiting for log data...</p>}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default LiveLogTerminal
