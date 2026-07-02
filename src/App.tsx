import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Explore from "./pages/Explore";
import Geography from "./pages/Geography";
import DataQuality from "./pages/DataQuality";
import Chat from "./pages/Chat";
import WikiIndex from "./pages/WikiIndex";
import WikiPage from "./pages/WikiPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="explore" element={<Explore />} />
        <Route path="geography" element={<Geography />} />
        <Route path="quality" element={<DataQuality />} />
        <Route path="chat" element={<Chat />} />
        <Route path="docs" element={<WikiIndex />} />
        <Route path="docs/:slug" element={<WikiPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
