import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { Inventory } from './views/Inventory';
import { NewCase } from './views/NewCase';
import { Requisitions } from './views/Requisitions';
import { Reports } from './views/Reports';
import { Settings } from './views/Settings';
import { LandingPage } from './views/LandingPage';
import { db } from './db/db';
import { resetDatabase } from './db/seed';

function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [dbInitialized, setDbInitialized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // to force reload views when db resets

  // Startup Database Seeding Check
  useEffect(() => {
    const checkAndSeed = async () => {
      try {
        // Preinstall cardiologist list if empty or not set
        const currentConsultants = localStorage.getItem('cathlab_consultants');
        if (!currentConsultants || currentConsultants === '[]') {
          const defaultDocs = ["Dr. V. D. Tripathi", "Dr. S. K. Tripathi", "Dr. A. Shukla", "Dr. S. K. Tiwari"];
          localStorage.setItem('cathlab_consultants', JSON.stringify(defaultDocs));
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const isDummy = supabaseUrl.includes('your-project-id') || !supabaseUrl;

        if (!isDummy) {
          try {
            const count = await db.pmjayPackages.count();
            if (count === 0) {
              console.log("Database is empty. Seeding default packages...");
              await resetDatabase();
            }
          } catch (err) {
            console.error("Failed to query packages count from Supabase:", err);
          }
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

  if (currentView === 'landing') {
    return <LandingPage onEnter={() => setCurrentView('dashboard')} />;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const isDummy = supabaseUrl.includes('your-project-id') || !supabaseUrl;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      
      {/* Navigation Sidebar - Hidden on browser print */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main View Area */}
      <main className="flex-1 min-h-screen overflow-y-auto print:overflow-visible print:bg-white print:p-0 flex flex-col">
        {isDummy && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold text-center no-print shadow-xs flex items-center justify-center gap-2">
            <span className="bg-amber-900 text-white px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">Notice</span>
            <span>Supabase is not configured yet. Please edit your <code>.env</code> file to add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</span>
          </div>
        )}
        <div className="mx-auto w-full max-w-7xl print:max-w-full flex-1">
          {renderActiveView()}
        </div>
      </main>

    </div>
  );
}

export default App;
