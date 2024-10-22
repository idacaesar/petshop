import { Navigate, useLocation } from "react-router-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import SigninPage from "./components/SigninPage";
import SignupPage from "./components/SignupPage";
import UserPage from "./components/UserPage";
import AdminPage from "./components/AdminPage";

// Timeout duration i millisekunder (5 minuter = 300000 ms)
const TIMEOUT_DURATION = 300000;

const AutoLogout = ({ children }) => {
  const [lastActivity, setLastActivity] = useState(Date.now());

  const handleActivity = () => {
    setLastActivity(Date.now());
  };

  useEffect(() => {
    // Lägg till event listeners för användaraktivitet
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "keypress",
    ];

    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Kontrollera inaktivitet var 10:e sekund
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity >= TIMEOUT_DURATION) {
        // Logga ut användaren
        sessionStorage.removeItem("token");
        window.location.href = "/signinpage";
      }
    }, 10000);

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [lastActivity]);

  return children;
};

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/signinpage" state={{ from: location }} replace />;
  }

  return <AutoLogout>{children}</AutoLogout>;
};

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/signinpage" element={<SigninPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <UserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/userpage"
            element={
              <ProtectedRoute>
                <UserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/adminpage"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
