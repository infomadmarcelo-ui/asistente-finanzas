import { db } from '../../db/db'
import type { EstadoOnboarding } from '../../db/types'

export interface EstadoOnboardingInfo {
  estado?: EstadoOnboarding
  paso: number
}

export async function obtenerEstadoOnboarding(): Promise<EstadoOnboardingInfo> {
  const config = await db.configApp.get('app')
  return { estado: config?.onboardingEstado, paso: config?.onboardingPaso ?? 0 }
}

async function actualizarConfigApp(cambios: { onboardingEstado?: EstadoOnboarding; onboardingPaso?: number }): Promise<void> {
  const actual = await db.configApp.get('app')
  await db.configApp.put({ ...(actual ?? { id: 'app' }), ...cambios })
}

export async function guardarPasoOnboarding(paso: number): Promise<void> {
  await actualizarConfigApp({ onboardingEstado: 'pendiente', onboardingPaso: paso })
}

export async function completarOnboarding(): Promise<void> {
  await actualizarConfigApp({ onboardingEstado: 'completado' })
}

export async function omitirOnboarding(): Promise<void> {
  await actualizarConfigApp({ onboardingEstado: 'omitido' })
}
