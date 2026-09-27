import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import POS from './pages/POS';
import CreditSale from './pages/CreditSale';
import ScrapSale from './pages/ScrapSale';
import Exchange from './pages/Exchange';
import Rates from './pages/Rates';
import Dispatch from './pages/Dispatch';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Returns from './pages/Returns';
import Reports from './pages/Reports';
import PaymentNotifications from './pages/PaymentNotifications';
import Settings from './pages/Settings';
import OrderHistory from './pages/OrderHistory';
import Employees from './pages/Employees';
import PartyTransfer from './pages/PartyTransfer';
import CashBank from './pages/CashBank';
import CashCustomerHistory from './pages/CashCustomerHistory';
import MinusStock from './pages/MinusStock';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="pos" element={<POS />} />
              <Route path="credit-sale" element={<CreditSale />} />
              <Route path="scrap-sale" element={<ScrapSale />} />
              <Route path="exchange" element={<Exchange />} />
              <Route path="rates" element={<Rates />} />
              <Route path="dispatch" element={<Dispatch />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="history" element={<OrderHistory />} />
              <Route path="returns" element={<Returns />} />
              <Route path="reports" element={<Reports />} />
              <Route path="notifications" element={<PaymentNotifications />} />
              <Route path="settings" element={<Settings />} />
              <Route path="employees" element={<Employees />} />
              <Route path="party-transfer" element={<PartyTransfer />} />
              <Route path="cash-bank" element={<CashBank />} />
              <Route path="cash-customer-history" element={<CashCustomerHistory />} />
              <Route path="minus-stock" element={<MinusStock />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
