import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SigninPage from "./components/SigninPage";
import UserPage from "./components/UserPage";
import AdminPage from "./components/AdminPage";

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/signinpage" state={{ from: location }} replace />;
  }

  return children;
};

// App.js

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/signinpage" element={<SigninPage />} />
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
