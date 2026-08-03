function StatTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

export default StatTile
