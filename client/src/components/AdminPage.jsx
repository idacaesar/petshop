import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminPage = () => {
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState([]);

  useEffect(() => {
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
      setMessage("Kunde inte hämta produkter. Var god försök igen senare.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        "http://localhost:5001/api/products",
        {
          name: productName,
          price: parseFloat(productPrice),
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
      fetchProducts(); // Uppdatera produktlistan efter att en ny produkt har skapats
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Ett fel uppstod vid skapande av produkt."
      );
    }
  };

  return (
    <div>
      <h1>Adminsida</h1>
      <p>
        Välkommen till adminsidan. Denna sida är endast tillgänglig för
        administratörer.
      </p>

      <h2>Befintliga produkter</h2>
      {products.length > 0 ? (
        <ul>
          {products.map((product) => (
            <li key={product._id}>
              {product.name} - {product.price} kr
            </li>
          ))}
        </ul>
      ) : (
        <p>Inga produkter tillgängliga.</p>
      )}

      <h2>Skapa ny produkt</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="productName">Produktnamn:</label>
          <input
            type="text"
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="productPrice">Pris:</label>
          <input
            type="number"
            id="productPrice"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            step="0.01"
            min="0"
            required
          />
        </div>
        <button type="submit">Skapa produkt</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default AdminPage;
