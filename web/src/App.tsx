import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ShopList } from './pages/ShopList';
import { ShopItems } from './pages/ShopItems';
import { Cart } from './pages/Cart';
import { Payment } from './pages/Payment';
import { OrderSuccess } from './pages/OrderSuccess';
import { Login } from './pages/Login';
import { ComingSoon, RouteError } from './pages/ComingSoon';

/**
 * The app's route map. Every page shares the <Layout> (header + footer);
 * react-router swaps the matched page into <Layout>'s <Outlet/>.
 */
const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/category/:key', element: <ShopList /> },
      { path: '/shop/:shopId', element: <ShopItems /> },
      { path: '/cart', element: <Cart /> },
      { path: '/checkout', element: <Payment /> },
      { path: '/order-success', element: <OrderSuccess /> },
      { path: '/track', element: <ComingSoon title="Track Your Order" /> },
      { path: '/help', element: <ComingSoon title="Help Center" /> },
      { path: '*', element: <ComingSoon title="Page not found" /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
