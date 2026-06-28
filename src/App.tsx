import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { Inventory } from './views/Inventory';
import { NewCase } from './views/NewCase';
import { Requisitions } from './views/Requisitions';
import { Reports } from './views/Reports';
import { Settings } from './views/Settings';
import { db } from './db/db';
import { resetDatabase } from './db/seed';

function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [dbInitialized, setDbInitialized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // to force reload views when db resets

  // Startup Database Seeding Check
  useEffect(() => {
    const checkAndSeed = async () => {
      try {
        const count = await db.items.count();
        if (count === 0) {
          console.log("No inventory items found. Seeding database...");
          await resetDatabase();
          console.log("Database seeded successfully!");
        }
      } catch (err) {
        console.error("Error checking or seeding database:", err);
      } finally {
        setDbInitialized(true);
      }
    };
    checkAndSeed();
  }, [refreshKey]);

  const handleResetSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setCurrentView('dashboard');
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} />;
      case 'inventory':
        return <Inventory />;
      case 'new-case':
        return <NewCase onSuccess={() => setCurrentView('dashboard')} />;
      case 'requisitions':
        return <Requisitions />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings onResetSuccess={handleResetSuccess} />;
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  if (!dbInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-400">Initializing Database Schema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      
      {/* Navigation Sidebar - Hidden on browser print */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main View Area */}
      <main className="flex-1 min-h-screen overflow-y-auto print:overflow-visible print:bg-white print:p-0">
        <div className="mx-auto w-full max-w-7xl print:max-w-full">
          {renderActiveView()}
        </div>
      </main>

    </div>
  );
}

export default App;
