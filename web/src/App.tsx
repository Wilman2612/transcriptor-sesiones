import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { SessionListPage } from "./pages/SessionListPage";
import { UploadPage } from "./pages/UploadPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ReviewPage } from "./pages/ReviewPage";
import { GlossaryPage } from "./pages/GlossaryPage";

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <header className="topbar">
        <Link className="topbar__brand" to="/">
          📋 Transcriptor Municipal
        </Link>
        <span style={{ display: "flex", gap: "1.2rem" }}>
          <Link className="topbar__link" to="/glossary">
            Glosario
          </Link>
          <Link className="topbar__link" to="/upload">
            Nueva sesión
          </Link>
        </span>
      </header>
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "1.5rem" }}>
        <Routes>
          <Route path="/" element={<SessionListPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/sessions/:id/progress" element={<ProgressPage />} />
          <Route path="/sessions/:id/review" element={<ReviewPage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
