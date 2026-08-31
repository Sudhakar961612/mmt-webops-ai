export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 text-gray-500">
      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
