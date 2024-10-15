import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/UserPage.css";

const UserPage = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem("user"));
    if (userData) {
      setUser(userData);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signinpage");
  };

  if (!user) {
    return <div className="loading">Laddar...</div>;
  }

  return (
    <div className="webshop">
      <header className="webshop-header">
        <h1>PetShop</h1>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
        <nav className={menuOpen ? "open" : ""}>
          <ul>
            <li>
              <a href="#" className="active">
                Hem
              </a>
            </li>
            <li>
              <a href="#">Produkter</a>
            </li>
            <li>
              <a href="#">Om oss</a>
            </li>
            <li>
              <a href="#">Kontakt</a>
            </li>
          </ul>
        </nav>
        <div className="user-info">
          <span>{user.email}</span>
          <button className="logout-button" onClick={handleLogout}>
            Logga ut
          </button>
        </div>
      </header>
      <main className="webshop-content">
        <aside className="sidebar">
          <h2>Kategorier</h2>
          <ul>
            <li>
              <a href="#">Hundar</a>
            </li>
            <li>
              <a href="#">Katter</a>
            </li>
            <li>
              <a href="#">Fåglar</a>
            </li>
            <li>
              <a href="#">Fiskar</a>
            </li>
          </ul>
        </aside>
        <section className="product-grid">
          <h2>Populära produkter</h2>
          <div className="products">
            {[1, 2, 3, 4].map((product) => (
              <div key={product} className="product-card">
                <div className="product-image"></div>
                <h3>Produkt {product}</h3>
                <p>Pris: {product * 100} kr</p>
                <button>Lägg i varukorg</button>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="webshop-footer">
        <p>&copy; 2024 PetShop. Egendesignad av Ida Caesar.</p>
      </footer>
    </div>
  );
};

export default UserPage;
