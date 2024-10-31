import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/UserPage.css";

const AdminPage = () => {
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [stockCount, setStockCount] = useState(""); // Ny state för lagersaldo
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (parseInt(stockCount) < 0) {
      setMessage("Lagersaldo kan inte vara negativt.");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        "http://localhost:5001/api/products",
        {
          name: productName,
          price: parseFloat(productPrice),
          stockCount: parseInt(stockCount), // Lägg till stockCount i API-anropet
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage("Produkt skapad framgångsrikt!");
      setProductName("");
      setProductPrice("");
      setStockCount(""); // Återställ lagersaldo
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Ett fel uppstod vid skapande av produkt."
      );
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signinpage");
  };

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
              <a href="/userpage">Hem</a>
            </li>
            <li>
              <a href="#" className="active">
                Skapa produkt
              </a>
            </li>
          </ul>
        </nav>
        <div className="user-info">
          <button className="logout-button" onClick={handleLogout}>
            Logga ut
          </button>
        </div>
      </header>

      <main className="webshop-content">
        <h1>Skapa en ny produkt</h1>
        <p>Du kan endast skapa en produkt om du är en administratör.</p>

        <h2>Skapa ny produkt</h2>
        <form onSubmit={handleSubmit} className="create-product-form">
          <div className="form-group">
            <label htmlFor="productName">Produktnamn:</label>
            <input
              type="text"
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="productPrice">Pris:</label>
            <input
              type="number"
              id="productPrice"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              step="0.01"
              min="0"
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="stockCount">Lagersaldo:</label>
            <input
              type="number"
              id="stockCount"
              value={stockCount}
              onChange={(e) => setStockCount(e.target.value)}
              min="0"
              required
              className="form-input"
              placeholder="Ange antal i lager"
            />
          </div>
          <button type="submit" className="submit-button">
            Skapa produkt
          </button>
        </form>
        {message && <p className="message">{message}</p>}
      </main>

      <footer className="webshop-footer">
        <p>
          &copy; 2024 PetShop. Egendesignad av Ida Caesar och Andreas Ottoson.
        </p>
      </footer>
    </div>
  );
};

export default AdminPage;
