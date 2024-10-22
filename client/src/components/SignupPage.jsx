import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/SignupPage.css";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Funktion för att kontrollera om lösenordet är bara upprepade tecken
  const isRepeatedChars = (str) => {
    return str.split("").every((char) => char === str[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Kontrollera om lösenorden matchar
    if (password !== confirmPassword) {
      setMessage("Lösenorden matchar inte.");
      return;
    }

    // Kontrollera om lösenordet är minst 8 tecken långt
    if (password.length < 8) {
      setMessage("Lösenordet måste vara minst 8 tecken.");
      return;
    }

    // Kontrollera om lösenordet är samma som e-posten
    if (password.toLowerCase() === email.toLowerCase()) {
      setMessage("Lösenordet får inte vara samma som e-postadressen.");
      return;
    }

    // Kontrollera om lösenordet är bara samma tecken upprepat
    if (isRepeatedChars(password)) {
      setMessage("Lösenordet får inte vara samma tecken upprepat.");
      return;
    }

    try {
      await axios.post("http://localhost:5001/api/signup", {
        email,
        password,
      });

      setMessage("Registrering lyckades! Du kan nu logga in.");

      // Omregistrera användaren till inloggningssidan efter 1,5 sekunder
      setTimeout(() => navigate("/signinpage"), 1500);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Ett fel uppstod vid registrering"
      );
    }
  };

  return (
    <div className="signup-container">
      <h1 className="signup-title">Skapa ett konto hos PetShop</h1>
      <p className="signup-description">Fyll i dina uppgifter nedan</p>

      <form onSubmit={handleSubmit} className="signup-form">
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
            placeholder="Välj ett lösenord"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Bekräfta lösenord
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="form-input"
            placeholder="Bekräfta ditt lösenord"
          />
        </div>

        <button type="submit" className="signup-button">
          Registrera
        </button>
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default SignupPage;
