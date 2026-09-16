import { HashRouter, Route, Routes } from 'react-router-dom'
import { ConfirmProvider } from './components/ConfirmProvider'
import { AuthProvider } from './features/auth/AuthContext'
import { AuthGate } from './features/auth/AuthGate'
import { Layout } from './features/shell/Layout'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { BalancePage } from './features/balance/BalancePage'
import { MovimientosPage } from './features/movements/MovimientosPage'
import { CuentasPage } from './features/accounts/CuentasPage'
import { TarjetasPage } from './features/cards/TarjetasPage'
import { CategoriasPage } from './features/categories/CategoriasPage'
import { RecordatoriosPage } from './features/reminders/RecordatoriosPage'
import { VehiculosPage } from './features/vehicles/VehiculosPage'
import { InversionesPage } from './features/investments/InversionesPage'
import { MetasPage } from './features/goals/MetasPage'
import { MasPage } from './features/shell/MasPage'
import { ResumenMensualPage } from './features/reports/ResumenMensualPage'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { BackupPage } from './features/backup/BackupPage'
import { AyudaPage } from './features/help/AyudaPage'

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <ConfirmProvider>
          <HashRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/balance" element={<BalancePage />} />
                <Route path="/movimientos" element={<MovimientosPage />} />
                <Route path="/cuentas" element={<CuentasPage />} />
                <Route path="/tarjetas" element={<TarjetasPage />} />
                <Route path="/categorias" element={<CategoriasPage />} />
                <Route path="/recordatorios" element={<RecordatoriosPage />} />
                <Route path="/vehiculos" element={<VehiculosPage />} />
                <Route path="/inversiones" element={<InversionesPage />} />
                <Route path="/metas" element={<MetasPage />} />
                <Route path="/resumen" element={<ResumenMensualPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/backup" element={<BackupPage />} />
                <Route path="/ayuda" element={<AyudaPage />} />
                <Route path="/mas" element={<MasPage />} />
              </Route>
            </Routes>
          </HashRouter>
        </ConfirmProvider>
      </AuthGate>
    </AuthProvider>
  )
}
