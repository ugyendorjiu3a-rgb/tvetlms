// Small shared feedback primitives — used across every page so loading/error/empty states look
// and behave consistently (task requirement: "loading/error states" throughout).

export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="w-fit text-red-900 underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
      <span className="font-medium text-slate-600">{title}</span>
      {hint && <span>{hint}</span>}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
      {message}
    </div>
  );
}
