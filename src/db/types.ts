// Modelo de datos. Ver prompt-app-asistente.md (raíz del repo) para la especificación completa.

export type Moneda = 'ARS' | 'USD'

export type TipoCuenta = 'caja_ahorro' | 'cuenta_corriente' | 'billetera_virtual' | 'efectivo'

export interface Cuenta {
  id: string
  /** Alias opcional (ej: "Sueldo"). El nombre que se muestra por defecto se arma con entidad + tipo. */
  nombre?: string
  tipo: TipoCuenta
  moneda: Moneda
  /** Banco o billetera (ej: "Banco Ciudad", "Mercado Pago"). */
  entidad?: string
  /** Saldo con el que arrancó la cuenta al cargarla (onboarding o alta manual). El saldo actual se calcula sumando los movimientos. */
  saldoInicial: number
  archivada: boolean
  creadoEn: string
}

export interface TarjetaCredito {
  id: string
  nombre: string
  limite: number
  moneda: Moneda
  /** Día del mes en que cierra el resumen (1-31). */
  diaCierre: number
  /** Día del mes en que vence el pago del resumen (1-31). */
  diaVencimiento: number
  /** Cuenta desde la que se paga el resumen. */
  cuentaPagoId: string
  archivada: boolean
  creadoEn: string
}

export type TipoCategoria = 'ingreso' | 'gasto'

export interface Categoria {
  id: string
  nombre: string
  tipo: TipoCategoria
  esFijo: boolean
  archivada: boolean
}

export interface FuenteIngreso {
  id: string
  nombre: string
  recurrente: boolean
  archivada: boolean
}

export type TipoMovimiento = 'ingreso' | 'gasto' | 'transferencia'

export type MedioPago =
  | { tipo: 'cuenta'; cuentaId: string }
  | { tipo: 'tarjeta'; tarjetaId: string }
  | { tipo: 'inversion'; inversionId: string }

export type Dimension =
  | { tipo: 'vehiculo'; id: string }
  | { tipo: 'cliente'; label: string }
  | { tipo: 'proyecto'; label: string }

export interface MovimientoBase {
  id: string
  fecha: string // ISO yyyy-MM-dd
  descripcion?: string
  categoriaId?: string
  dimension?: Dimension
  creadoEn: string
}

export interface MovimientoIngreso extends MovimientoBase {
  tipo: 'ingreso'
  monto: number
  moneda: Moneda
  cuentaId: string
  fuenteIngresoId?: string
}

export interface MovimientoGasto extends MovimientoBase {
  tipo: 'gasto'
  monto: number
  moneda: Moneda
  /**
   * Los gastos con tarjeta NO pasan por acá: se cargan como CompraCuotas
   * (aunque sea en un solo pago, con cantidadCuotas = 1). Un gasto normal
   * siempre sale directo de una cuenta (efectivo, débito, billetera).
   */
  cuentaId: string
  /** Solo para cargas de combustible (dimension de vehículo): litros cargados y
   * odómetro en ese momento, para calcular consumo (km/l y $/km) entre cargas. */
  litros?: number
  odometro?: number
}

/**
 * Transferencia entre dos "lugares" (cuenta o tarjeta). No es un gasto ni un ingreso:
 * la plata solo cambia de lugar. Soporta origen/destino en distinta moneda (p. ej.
 * comprar dólares) por eso monto y moneda van separados para cada lado.
 */
export interface MovimientoTransferencia extends MovimientoBase {
  tipo: 'transferencia'
  origen: MedioPago
  destino: MedioPago
  montoOrigen: number
  monedaOrigen: Moneda
  montoDestino: number
  monedaDestino: Moneda
}

export type Movimiento = MovimientoIngreso | MovimientoGasto | MovimientoTransferencia

export interface CompraCuotas {
  id: string
  tarjetaId: string
  fecha: string
  descripcion: string
  categoriaId?: string
  montoTotal: number
  moneda: Moneda
  cantidadCuotas: number
  creadoEn: string
  /** Si se cargó como un gasto en dólares (ej: suscripción del exterior) en una
   * tarjeta en pesos, acá queda el monto original y cómo se calculó `montoTotal`
   * (cotización + recargo por "dólar tarjeta"), solo a modo informativo. */
  origenUsd?: {
    montoUsd: number
    cotizacion: number
    recargoPct: number
  }
}

export type EstadoCuota = 'pendiente' | 'pagada'

export interface Cuota {
  id: string
  compraId: string
  numero: number
  monto: number
  moneda: Moneda
  /** Período (resumen) en que impacta esta cuota, formato yyyy-MM. */
  periodo: string
  estado: EstadoCuota
  pagadaEn?: string
}

export interface Cotizacion {
  id: 'oficial'
  valor: number
  actualizadoEn: string
  fuente: 'api' | 'manual'
}

// --- Entidades de fases siguientes (tablas reservadas para no migrar el esquema después) ---

export interface Vehiculo {
  id: string
  marca: string
  modelo: string
  anio: number
  patente: string
  valorEstimado: number
  moneda: Moneda
  odometroActual: number
  archivado: boolean
  creadoEn: string
}

export interface MetaAhorro {
  id: string
  nombre: string
  moneda: Moneda
  montoObjetivo: number
  fechaObjetivo?: string
  cuentaId: string
  archivada: boolean
  creadoEn: string
}

export interface Inversion {
  id: string
  tipo: 'plazo_fijo' | 'otro'
  capital: number
  moneda: Moneda
  fechaInicio: string
  fechaVencimiento: string
  rendimiento: number
  cuentaOrigenId: string
  liquidada: boolean
  creadoEn: string
}

export type FrecuenciaRecurrencia = 'unica' | 'mensual' | 'anual'

export type TipoRecordatorio =
  | 'vencimiento_pago'
  | 'mantenimiento_vehiculo'
  | 'cumpleanos'
  | 'tramite'
  | 'documento'
  | 'salud'
  | 'revisar'
  | 'otro'

export interface Recordatorio {
  id: string
  titulo: string
  tipo: TipoRecordatorio
  /** Fecha ancla: para 'unica' es la fecha exacta del evento; para 'mensual' se usa
   * el día, y para 'anual' el mes y día, para proyectar la próxima ocurrencia. No se
   * usa cuando el recordatorio es por kilómetros (ver condicionKm). */
  fecha?: string
  /** Alerta por kilómetros en vez de fecha (mantenimiento de vehículo). Si está seteado,
   * junto con vehiculoId, el recordatorio ignora fecha/frecuencia/antelacionDias. */
  condicionKm?: number
  /** Avisar cuando falten estos kilómetros o menos para condicionKm. */
  antelacionKm?: number
  frecuencia: FrecuenciaRecurrencia
  antelacionDias: number
  vehiculoId?: string
  /** Marca el recordatorio como resuelto: para 'unica' o por kilómetros. */
  completado: boolean
  archivado: boolean
  creadoEn: string
}

export interface Recurrencia {
  id: string
  concepto: string
  tipo: 'ingreso' | 'gasto'
  monto: number
  moneda: Moneda
  categoriaId?: string
  cuentaId?: string
  frecuencia: 'mensual' | 'anual'
  diaDelMes: number
  /** Solo para frecuencia 'anual' (1-12). */
  mes?: number
  /** Si está activo, además de recordar, carga el movimiento solo cuando llega la fecha. */
  generarMovimiento: boolean
  activa: boolean
  /** Último período ya generado (yyyy-MM para mensual, yyyy para anual), para no duplicar. */
  ultimoPeriodoGenerado?: string
  /** El recordatorio que se crea junto con la recurrencia, para avisar del vencimiento. */
  recordatorioId?: string
  creadoEn: string
}

// --- Configuración local (candado, WebAuthn, ubicación para clima) ---

export interface ConfigAuth {
  id: 'auth'
  /** Hash PBKDF2 del PIN/contraseña, nunca el valor en texto plano. */
  pinHash: string
  pinSalt: string
  webauthnCredentialId?: string
  webauthnPublicKey?: JsonWebKey
}

export type EstadoOnboarding = 'pendiente' | 'completado' | 'omitido'

export interface ConfigApp {
  id: 'app'
  ubicacionClima?: { lat: number; lon: number; nombre: string }
  /** undefined = nunca se abrió el asistente inicial todavía. */
  onboardingEstado?: EstadoOnboarding
  /** Paso (0-based) donde quedó si lo dejó a medias, para poder retomarlo. */
  onboardingPaso?: number
}
