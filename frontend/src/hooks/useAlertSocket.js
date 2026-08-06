import { useEffect, useRef } from 'react'

const RECONNECT_DELAY_MS = 3000

function useAlertSocket(onAlert) {
  const onAlertRef = useRef(onAlert)
  onAlertRef.current = onAlert

  useEffect(() => {
    let socket
    let reconnectTimer
    let isUnmounted = false

    function connect() {
      const token = localStorage.getItem('access_token')
      socket = new WebSocket(`ws://${window.location.hostname}:8000/ws?token=${token}`)

      socket.onmessage = (event) => {
        const alert = JSON.parse(event.data)
        onAlertRef.current(alert)
      }

      socket.onclose = () => {
        if (isUnmounted) return
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      isUnmounted = true
      clearTimeout(reconnectTimer)
      socket.close()
    }
  }, [])
}

export default useAlertSocket
