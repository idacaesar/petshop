import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/SigninPage.css";

const SigninPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5001/api/signin", {
        email,
        password,
      });

      // Spara token i sessionStorage
      sessionStorage.setItem("token", response.data.token);

      sessionStorage.setItem(
        "user",
        JSON.stringify({
          email: email,
          isAdmin: response.data.isAdmin,
        })
      );

      setMessage("Inloggning lyckades!");

      setTimeout(() => navigate("/userpage"), 1500);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Ett fel uppstod vid inloggning"
      );
    }
  };

  return (
    <div className="signin-container">
      <h1 className="signin-title">Välkommen till PetShop</h1>
      <p className="signin-description">Logga in</p>

      <form onSubmit={handleSubmit} className="signin-form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            E-post
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
            placeholder="Din e-postadress"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Lösenord
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="form-input"
            placeholder="Ditt lösenord"
          />
        </div>
        <button type="submit" className="signin-button">
          Logga in
        </button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default SigninPage;
