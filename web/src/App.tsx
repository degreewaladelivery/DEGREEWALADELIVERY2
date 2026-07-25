import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ShopList } from './pages/ShopList';
import { ShopItems } from './pages/ShopItems';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { Cart } from './pages/Cart';
import { Payment } from './pages/Payment';
import { OrderSuccess } from './pages/OrderSuccess';
import { Login } from './pages/Login';
import { ComingSoon, RouteError } from './pages/ComingSoon';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import { AdminLogin } from './admin/AdminLogin';
import { AdminLayout } from './admin/AdminLayout';
import { RequireAdmin } from './admin/RequireAdmin';
import { CategoriesPage } from './admin/CategoriesPage';
import { CategoryDetailPage } from './admin/CategoryDetailPage';
import { ShopsPage } from './admin/ShopsPage';
import { ShopDetailPage } from './admin/ShopDetailPage';
import { SettingsPage } from './admin/SettingsPage';
import { AgentsPage } from './admin/AgentsPage';
import { AgentAuthProvider } from './agent/AgentAuthContext';
import { AgentLogin } from './agent/AgentLogin';
import { AgentLayout } from './agent/AgentLayout';
import { RequireAgent } from './agent/RequireAgent';
import { AgentOrdersPage } from './agent/AgentOrdersPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/category/:key', element: <ShopList /> },
      { path: '/shop/:shopId', element: <ShopItems /> },
      { path: '/item/:id', element: <ItemDetailPage /> },
      { path: '/cart', element: <Cart /> },
      { path: '/checkout', element: <Payment /> },
      { path: '/order-success', element: <OrderSuccess /> },
      { path: '/track', element: <ComingSoon title="Track Your Order" /> },
      { path: '/help', element: <ComingSoon title="Help Center" /> },
      { path: '*', element: <ComingSoon title="Page not found" /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <AdminAuthProvider>
        <Outlet />
      </AdminAuthProvider>
    ),
    errorElement: <RouteError />,
    children: [
      { path: 'login', element: <AdminLogin /> },
      {
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'categories/:categoryId', element: <CategoryDetailPage /> },
          { path: 'shops', element: <ShopsPage /> },
          { path: 'shops/:shopId', element: <ShopDetailPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'agents', element: <AgentsPage /> },
        ],
      },
    ],
  },
  {
    path: '/agent',
    element: (
      <AgentAuthProvider>
        <Outlet />
      </AgentAuthProvider>
    ),
    errorElement: <RouteError />,
    children: [
      { path: 'login', element: <AgentLogin /> },
      {
        element: (
          <RequireAgent>
            <AgentLayout />
          </RequireAgent>
        ),
        children: [{ path: 'orders', element: <AgentOrdersPage /> }],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
