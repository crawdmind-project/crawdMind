import LandingPage from "./pages/LandingPage";
import { Login, Register } from "./pages/AuthPages";
import IdeasDashboard from "./pages/IdeasDashboard";
import Leaderboard  from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import ModerationQueue from "./pages/ModerationQueue";
import AdminUsers from "./pages/AdminUsers";
import Navbar from "./components/Navbar"; 
import NewIdeaModal from "./components/NewIdeaModal";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useState } from "react";

function AppContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  
  const hideNavbarPaths = ["/", "/login", "/register"];
  const shouldHideNavbar = hideNavbarPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {!shouldHideNavbar && (
        <Navbar onOpenNewIdeaModal={() => setIsModalOpen(true)} />
      )}

      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ideas" element={<IdeasDashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/moderation" element={<ModerationQueue />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Routes>
      </main>

      {isModalOpen && (
        <NewIdeaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={() => {
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;