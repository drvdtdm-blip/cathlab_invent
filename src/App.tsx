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
import { initializeLocalUsers } from './utils/localAuth';

function App() {
  // Read initial session from localStorage
  const [session, setSession] = useState<any>(() => {
    const saved = localStorage.getItem('cathlab_local_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState<string>(() => {
    const saved = localStorage.getItem('cathlab_local_session');
    return saved ? 'dashboard' : 'landing';
  });
  const [dbInitialized, setDbInitialized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // to force reload views when db resets

  // Initialize local users db on mount
  useEffect(() => {
    initializeLocalUsers();
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

        // Check if we have seeded the new Excel rate contract items
        const excelSeeded = localStorage.getItem('cathlab_excel_seeded_v3');
        if (!excelSeeded) {
          console.log("Seeding new MPPHSCL Live Rate Contract items and packages...");
          await resetDatabase();
          localStorage.setItem('cathlab_excel_seeded_v3', 'true');
        } else {
          // Fallback check
          const count = await db.pmjayPackages.count();
          if (count === 0) {
            await resetDatabase();
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

  const handleSignOut = () => {
    localStorage.removeItem('cathlab_local_session');
    setSession(null);
    setCurrentView('landing');
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



  // Render Landing Page or Login page if user has no session
  if (!session) {
    if (currentView === 'landing') {
      return <LandingPage onEnter={() => setCurrentView('login')} />;
    }
    return <Login onLoginSuccess={(userSession) => {
      setSession(userSession);
      setCurrentView('dashboard');
    }} />;
  }

  if (!dbInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-400 font-sans">Initializing Database Schema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      
      {/* Navigation Sidebar - Hidden on browser print */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        userRole={userRole} 
        onSignOut={handleSignOut} 
      />

      {/* Main View Area */}
      <main className="flex-1 min-h-screen overflow-y-auto print:overflow-visible print:bg-white print:p-0 flex flex-col">
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
