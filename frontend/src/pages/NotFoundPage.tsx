import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
      <div className="text-4xl">🧭</div>
      <h1 className="text-lg font-semibold text-slate-800">Page not found</h1>
      <Link to="/" className="text-sm text-blue-700 underline">
        Go home
      </Link>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="text-lg font-semibold text-slate-800">You don't have access to this page</h1>
      <Link to="/" className="text-sm text-blue-700 underline">
        Go home
      </Link>
    </div>
  );
}
