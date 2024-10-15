import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SigninPage from "./components/SigninPage";
import UserPage from "./components/UserPage";
import AdminPage from "./components/AdminPage";

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<SigninPage />} />
          <Route path="/userpage" element={<UserPage />} />
          <Route path="/adminpage" element={<AdminPage />} />
          <Route path="/signinpage" element={<SigninPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
