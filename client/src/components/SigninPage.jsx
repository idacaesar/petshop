import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/SigninPage.css";

const SigninPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [remainingTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) {
      setMessage(`Vänta ${remainingTime} sekunder innan du försöker igen.`);
      return;
    }

    try {
      const response = await axios.post("http://localhost:5001/api/signin", {
        email,
        password,
      });

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
      const response = error.response?.data;

      if (response?.locked) {
        setIsLocked(true);
        setRemainingTime(response.remainingTime);
      }

      setMessage(response?.message || "Ett fel uppstod vid inloggning");
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
            disabled={isLocked}
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
            disabled={isLocked}
          />
        </div>
        <button type="submit" className="signin-button" disabled={isLocked}>
          {isLocked ? `Låst (${remainingTime}s)` : "Logga in"}
        </button>
      </form>
      {message && <p className="message">{message}</p>}
      <p className="signup-link">
        Har du inget konto? <Link to="/signup">Skapa ett här</Link>
      </p>
    </div>
  );
};

export default SigninPage;
