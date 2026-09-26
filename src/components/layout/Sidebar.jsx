import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Recycle,
  ArrowLeftRight,
  TrendingUp,
  Truck,
  Users,
  History,
  Undo2,
  BarChart3,
  Bell,
  Settings,
  X,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/pos', label: 'POS / Cash Sale', icon: ShoppingCart },
  { to: '/credit-sale', label: 'Credit Sale (Udhaar)', icon: CreditCard },
  { to: '/scrap-sale', label: 'Scrap Sale', icon: Recycle },
  { to: '/exchange', label: 'Item Exchange', icon: ArrowLeftRight },
  { to: '/rates', label: 'Rate Management', icon: TrendingUp },
  { to: '/dispatch', label: 'Bulk Dispatch', icon: Truck },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/history', label: 'Order History', icon: History },
  { to: '/returns', label: 'Returns', icon: Undo2 },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/notifications', label: 'Payment Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile, onToggleCollapse }) {
  const location = useLocation();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-900/30">
          <span className="font-display text-sm font-bold text-white">CM</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <p className="whitespace-nowrap font-display text-base font-bold text-white">Electric Shop</p>
              <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-brand-200">
                Trading & Billing
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={onCloseMobile}
          className="ml-auto rounded-lg p-1.5 text-brand-200 hover:bg-white/10 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-thin">
        {navItems.map((item) => {
          const active =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-brand-100/80 hover:bg-white/8 hover:text-white'
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-300"
                />
              )}
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-brand-200')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="hidden border-t border-white/10 p-2 lg:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-200 transition hover:bg-white/10"
        >
          <ChevronLeft className={cn('h-4 w-4 transition', collapsed && 'rotate-180')} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden bg-gradient-to-b from-ink-950 via-ink-900 to-brand-900 transition-all duration-300 lg:block',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {content}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink-950/60 lg:hidden"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-ink-950 via-ink-900 to-brand-900 lg:hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
