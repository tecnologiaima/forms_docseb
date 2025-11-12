import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";

import IKDC from "./pages/IKDC";
import LysholmTegner from "./pages/LysholmTegner";
import WOMAC from "./pages/WOMAC";
import IKS from "./pages/IKS";
import KOOS from "./pages/KOOS";
import PreIntake from "./pages/pre";
import "./App.css";

function Home() {
  return (
    <div>
      <h1>🏠 Bienvenido</h1>
      <p>Selecciona una ruta:</p>
      <nav>
        <ul>
          <li><Link to="/IKDC">IKDC</Link></li>
          {/* Ejemplos con ID (opcional usar en tus pruebas) */}
          <li><Link to="/IKDC/USER123">IKDC (id en path)</Link></li>
          <li><Link to="/IKDC?id=USER123">IKDC (id en query)</Link></li>

          <li><Link to="/LYSHOLM-TEGNER">LYSHOLM-TEGNER</Link></li>
          <li><Link to="/WOMAC">WOMAC</Link></li>
          <li><Link to="/IKS">IKS</Link></li>
          <li><Link to="/KOOS">KOOS</Link></li>
        </ul>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/IKDC" replace />} />
        {/* IKDC sin ID */}
        <Route path="/IKDC" element={<IKDC />} />
        {/* IKDC con ID en path */}
        <Route path="/IKDC/:id" element={<IKDC />} />

        <Route path="/LYSHOLM-TEGNER" element={<LysholmTegner />} />
        <Route path="/LYSHOLM-TEGNER/:id" element={<LysholmTegner />} />


        <Route path="/WOMAC" element={<WOMAC />} />
        <Route path="/WOMAC/:id" element={<WOMAC />} /> {/* ⬅️ NUEVA */}

        <Route path="/IKS" element={<IKS />} />
        <Route path="/IKS/:id" element={<IKS />} /> {/* ⬅️ nueva */}

        <Route path="/KOOS" element={<KOOS />} />
        <Route path="/KOOS/:id" element={<KOOS />} /> {/* ⬅️ NUEVA */}
        <Route path="/PRE" element={<PreIntake />} />
      </Routes>
    </Router>
  );
}
