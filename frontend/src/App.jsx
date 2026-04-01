import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useGame } from "./context/GameContext";
import Admin from "./pages/Admin";
import Hunt from "./pages/Hunt";
import Landing from "./pages/Landing";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import Victory from "./pages/Victory";

function ProtectedRoute({ children }) {
  const { state } = useGame();
  return state.team ? children : <Navigate to="/register" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/hunt"
          element={
            <ProtectedRoute>
              <Hunt />
            </ProtectedRoute>
          }
        />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route
          path="/victory"
          element={
            <ProtectedRoute>
              <Victory />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
