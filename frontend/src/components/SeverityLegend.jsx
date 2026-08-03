function SeverityLegend({ counts }) {
  const items = [
    { label: 'High', value: counts.high || 0, color: 'var(--status-critical)' },
    { label: 'Medium', value: counts.medium || 0, color: 'var(--status-warning)' },
    { label: 'Low', value: counts.low || 0, color: 'var(--status-good)' },
  ]

  return (
    <div className="flex items-center gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}></span>
          <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export default SeverityLegend
