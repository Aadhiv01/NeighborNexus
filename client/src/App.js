import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import Signup from "./components/Signup/Signup";
import "./App.css";
import Login from "./components/Login/Login";

function App() {
  return (
    <div className="App">
      <div className="content">
        <Routes>
          <Route exact path="login" element={<Login />} />
          <Route exact path="signup" element={<Signup />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
