import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Card({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className ?? ''}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50',
    secondary:
      'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  }[variant]
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${styles} ${className ?? ''}`}
      {...props}
    />
  )
}

export function Field({ label, children }: LabelHTMLAttributes<HTMLLabelElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-slate-600 dark:text-slate-300">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

const controlClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ''}`} />
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4" onClick={onClose}>
      <div
        className="max-h-[90svh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:max-w-md md:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <span className="text-3xl">{icon}</span>
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}
