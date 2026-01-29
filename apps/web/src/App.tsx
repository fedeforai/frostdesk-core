import { Routes, Route } from 'react-router-dom';
import AdminGuard from './components/AdminGuard';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminPage />
          </AdminGuard>
        }
      />
    </Routes>
  );
}

export default App;
