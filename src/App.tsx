import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { Inventory } from './views/Inventory';
import { NewCase } from './views/NewCase';
import { Requisitions } from './views/Requisitions';
import { Reports } from './views/Reports';
import { Settings } from './views/Settings';
import { LandingPage } from './views/LandingPage';
import { Login } from './components/Login';
import { db } from './db/db';
import { resetDatabase } from './db/seed';
import { supabase } from './db/supabaseClient';

function App() {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [currentView, setCurrentView] = useState<string>('landing');
  const [dbInitialized, setDbInitialized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // to force reload views when db resets

  // Auth Session check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Startup Database Seeding Check
  useEffect(() => {
    // Only run seed check if we have a valid session
    if (!session) return;

    const checkAndSeed = async () => {
      try {
        // Reset doctor list to start empty
        const resetDone = localStorage.getItem('cathlab_consultants_reset_v2');
        if (!resetDone) {
          localStorage.setItem('cathlab_consultants', JSON.stringify([]));
          localStorage.setItem('cathlab_consultants_reset_v2', 'true');
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
  }, [refreshKey, session]);

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

  const userRole = session?.user?.user_metadata?.role || 'clinical';

  const isAllowed = (_view: string) => {
    return true; // Temporary bypass: allow access to all views for everyone
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-400 font-sans">Checking Session Credentials...</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!dbInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-400 font-sans">Initializing Database Schema...</p>
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
      <Sidebar currentView={currentView} onViewChange={setCurrentView} userRole={userRole} />

      {/* Main View Area */}
      <main className="flex-1 min-h-screen overflow-y-auto print:overflow-visible print:bg-white print:p-0 flex flex-col">
        {isDummy && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold text-center no-print shadow-xs flex items-center justify-center gap-2">
            <span className="bg-amber-900 text-white px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">Notice</span>
            <span>Supabase is not configured yet. Please edit your <code>.env</code> file to add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</span>
          </div>
        )}
        <div className="mx-auto w-full max-w-7xl print:max-w-full flex-1">
          {!isAllowed(currentView) ? (
            <div className="flex items-center justify-center min-h-[70vh] p-4 font-sans">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
                <div className="mx-auto bg-red-500/10 text-red-500 p-3.5 rounded-2xl w-14 h-14 flex items-center justify-center border border-red-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-white">Access Restricted</h2>
                  <p className="text-xs leading-normal text-slate-400">Your user account role (<strong>{userRole}</strong>) does not have permission to access the <strong>{currentView}</strong> section.</p>
                </div>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            renderActiveView()
          )}
        </div>
      </main>

    </div>
  );
}

export default App;
