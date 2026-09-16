import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { NAV_ITEMS_SECUNDARIOS } from './Layout'

export function MasPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Más</h1>
      <div className="grid grid-cols-2 gap-3">
        {NAV_ITEMS_SECUNDARIOS.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="flex flex-col items-center gap-1 py-6 text-center hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-900">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
