import { useEffect, useState } from 'react'

// forces a re-render every intervalMs - components showing a relative time
// ("4 minutes ago") call this once so that text stays current on its own,
// instead of only updating when something else happens to re-render the page
function useTicker(intervalMs = 30000) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])
}

export default useTicker
