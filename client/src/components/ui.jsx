import Icon from './Icons.jsx';

export function Card({ title, subtitle, action, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div>
            {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={`${bodyClassName || ''}`}>{children}</div>
    </section>
  );
}

export function Button({
  children, onClick, type = 'button', variant = 'primary', size = 'md', disabled = false, className = '',
}) {
  const base =
    size === 'sm' ? 'px-3 py-1.5 text-sm rounded-lg' : size === 'xs' ? 'px-2 py-1 text-xs rounded-md' : 'px-4 py-2 text-sm rounded-lg';
  const tones = {
    primary: 'bg-brand-600 hover:bg-brand-500 text-white',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    warn: 'bg-amber-500 hover:bg-amber-400 text-white',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${base} ${tones[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, description, action, meta }) {
  return (
    <div className="mb-6">
      {meta && <div className="text-xs text-gray-400 mb-1">{meta}</div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-xl border border-dashed border-gray-300">
      <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="font-semibold text-gray-700">{title}</h3>
      {message && <p className="text-sm text-gray-500 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
      <div className="flex items-start gap-2">
        <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="underline text-red-800 shrink-0 hover:text-red-600">
          Retry
        </button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-8`}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </header>
        <div className="px-5 py-5">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onCancel, busy = false }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title || 'Are you sure?'}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </Modal>
  );
}

export function KeyValue({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className={`text-sm text-gray-800 font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</dd>
    </div>
  );
}