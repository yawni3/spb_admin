import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Orders from './pages/Orders';
import { ToastProvider } from './components/ToastProvider';

const isLoggedIn = () => !!localStorage.getItem("spb-admin-token");

const Protected = ({ children }) => {
  return isLoggedIn() ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/products" element={<Protected><Products /></Protected>} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} /> 
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;