import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Diagnose from "./pages/Diagnose";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/diagnose" element={<Diagnose />} />
    </Routes>
  );
}
