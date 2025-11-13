import React from 'react';
import InstanceTable from './components/InstanceTable';

function App() {
  return (
    <div className="container mt-4">
      <header className="mb-4">
        <h1>Android Control Plane Dashboard</h1>
        <p className="lead">Live status of all managed emulator instances.</p>
      </header>
      <main>
        <InstanceTable />
      </main>
      <footer className="mt-4 text-muted">
        <p>Auto-refreshes every 5 seconds.</p>
      </footer>
    </div>
  );
}

export default App;
