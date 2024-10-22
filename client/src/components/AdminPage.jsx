import React, { useState } from "react";
import axios from "axios";

const AdminPage = () => {
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [message, setMessage] = useState("");

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
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Ett fel uppstod vid skapande av produkt."
      );
    }
  };

  return (
    <div>
      <h1>Skapa en ny produkt</h1>
      <p>Du kan endast skapa en produkt om du är en administratör.</p>

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
