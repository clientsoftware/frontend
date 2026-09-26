import { Menu, Bell, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-ink-600 transition hover:bg-ink-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-ink-800">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </p>
          <p className="text-xs text-ink-400">Manage sales, stock & accounts</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link to="/notifications">
          <Button variant="ghost" size="icon" className="relative text-ink-500">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
          </Button>
        </Link>
        <div className="hidden items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-2.5 py-1.5 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <User className="h-4 w-4" />
          </div>
          <div className="pr-1">
            <p className="text-xs font-semibold text-ink-800">{user?.name || 'Staff'}</p>
            <p className="text-[10px] capitalize text-ink-400">{user?.role || 'admin'}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="text-ink-500">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
