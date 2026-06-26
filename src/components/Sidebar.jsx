import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("spb-admin-token");
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>🥧</span>
        <p>SPB Admin</p>
      </div>

      <nav className="sidebar-nav">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          📊 Dashboard
        </Link>
        <Link to="/products" className={location.pathname === "/products" ? "active" : ""}>
          🛍️ Ürünler
        </Link>
        <Link to="/orders">📦 Siparişler</Link>
      </nav>

      <button className="sidebar-logout" onClick={logout}>
        🚪 Çıkış
      </button>
    </aside>
  );
};

export default Sidebar;