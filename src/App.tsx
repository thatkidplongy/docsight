import { NavLink, Route, Routes } from 'react-router-dom';
import BenchmarkPage from './pages/BenchmarkPage';
import DemoPage from './pages/DemoPage';

const NAV_LINKS = [
  { to: '/', label: 'Demo' },
  { to: '/benchmark', label: 'Benchmark' },
];

const App = () => (
  <div className="min-h-screen bg-neutral-950 text-neutral-200">
    <header className="border-b border-neutral-800">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <span className="font-semibold tracking-tight text-white">DocSight</span>
        {NAV_LINKS.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => (isActive ? 'text-white' : 'text-neutral-400 hover:text-white')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>

    <main className="mx-auto max-w-6xl px-6 py-10">
      <Routes>
        <Route path="/" element={<DemoPage />} />
        <Route path="/benchmark" element={<BenchmarkPage />} />
      </Routes>
    </main>
  </div>
);

export default App;
