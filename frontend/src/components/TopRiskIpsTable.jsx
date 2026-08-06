function TopRiskIpsTable({ ips }) {
  const maxRiskScore = Math.max(...ips.map((ip) => ip.risk_score), 1)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Top risk IPs</p>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-gray-400 dark:text-gray-500">
          <tr>
            <th className="pb-2 font-normal">IP address</th>
            <th className="pb-2 font-normal">Risk score</th>
          </tr>
        </thead>
        <tbody>
          {ips.map((ip) => {
            const percent = Math.round((ip.risk_score / maxRiskScore) * 100)
            return (
              <tr key={ip.ip_address} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-2 text-gray-900 dark:text-gray-100">{ip.ip_address}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${percent}%`, backgroundColor: 'var(--status-critical)' }}
                      />
                    </div>
                    <span className="text-gray-900 dark:text-gray-100">{ip.risk_score}</span>
                  </div>
                </td>
              </tr>
            )
          })}
          {ips.length === 0 && (
            <tr>
              <td colSpan={2} className="py-4 text-center text-gray-400 dark:text-gray-500">
                No IPs tracked yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default TopRiskIpsTable
