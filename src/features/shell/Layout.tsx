import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { procesarRecurrencias } from '../recurrences/recurrencesRepo'
import { actualizarCotizacionSiEstaVieja } from '../quotes/useCotizacion'
import { sembrarCategoriasPorDefecto } from '../categories/categoriesRepo'

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/movimientos', label: 'Movimientos', icon: '💸' },
  { to: '/tarjetas', label: 'Tarjetas', icon: '💳' },
  { to: '/recordatorios', label: 'Recordatorios', icon: '🔔' },
]

export const NAV_ITEMS_SECUNDARIOS: NavItem[] = [
  { to: '/balance', label: 'Balance', icon: '📊' },
  { to: '/resumen', label: 'Resumen mensual', icon: '📅' },
  { to: '/cuentas', label: 'Cuentas', icon: '🏦' },
  { to: '/categorias', label: 'Categorías', icon: '🏷️' },
  { to: '/vehiculos', label: 'Vehículos', icon: '🚗' },
  { to: '/inversiones', label: 'Inversiones', icon: '📈' },
  { to: '/metas', label: 'Metas de ahorro', icon: '🎯' },
  { to: '/backup', label: 'Backup', icon: '💾' },
  { to: '/ayuda', label: 'Ayuda', icon: '❓' },
]

const TODOS_LOS_ITEMS = [...NAV_ITEMS, ...NAV_ITEMS_SECUNDARIOS]

export function Layout() {
  useEffect(() => {
    sembrarCategoriasPorDefecto()
    procesarRecurrencias()
    actualizarCotizacionSiEstaVieja()
  }, [])

  const location = useLocation()
  const enSeccionSecundaria = NAV_ITEMS_SECUNDARIOS.some((item) => location.pathname === item.to)

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 text-slate-900 md:flex-row dark:bg-slate-950 dark:text-slate-100">
      <nav className="hidden w-56 shrink-0 border-r border-slate-200 p-4 md:block dark:border-slate-800">
        <p className="mb-6 px-2 text-lg font-semibold">Asistente</p>
        <ul className="space-y-1">
          {TODOS_LOS_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="relative flex-1 overflow-y-auto pb-20 md:pb-0">
        <Link
          to="/ayuda"
          title="Ayuda"
          aria-label="Ayuda"
          className="fixed right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-indigo-600 md:right-6 md:top-6 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800"
        >
          ?
        </Link>
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-950">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <NavLink
          to="/mas"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
            enSeccionSecundaria ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span className="text-lg leading-none">⋯</span>
          Más
        </NavLink>
      </nav>
    </div>
  )
}
