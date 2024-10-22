import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/UserPage.css";

const UserPage = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem("user"));
    if (userData) {
      setUser(userData);
    }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get("http://localhost:5001/api/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProducts(response.data);
    } catch (error) {
      console.error("Kunde inte hämta produkter:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signinpage");
  };

  if (loading) {
    return <div className="loading">Laddar...</div>;
  }

  if (!user) {
    return <div className="loading">Var god logga in...</div>;
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
              <a href="/adminpage">Produkter</a>
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
          <h2>Våra produkter</h2>
          <div className="products">
            {products.length > 0 ? (
              products.map((product) => (
                <div key={product._id} className="product-card">
                  <div className="product-image"></div>
                  <h3>{product.name}</h3>
                  <p>Pris: {product.price} kr</p>
                  <button>Lägg i varukorg</button>
                </div>
              ))
            ) : (
              <p>Inga produkter tillgängliga för tillfället.</p>
            )}
          </div>
        </section>
      </main>
      <footer className="webshop-footer">
        <p>
          &copy; 2024 PetShop. Egendesignad av Ida Caesar och Andreas Ottoson.
        </p>
      </footer>
    </div>
  );
};

export default UserPage;
