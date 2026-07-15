import React from 'react';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { type Item } from '../db/db';
import { supabase } from '../db/supabaseClient';
import { 
  LayoutDashboard, 
  Boxes, 
  FilePlus, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { data: items = [] } = useSupabaseTable<Item>('items');

  // Query low-stock count reactively
  const lowStockCount = items.filter(i => i.currentQuantity <= i.reorderLevel).length;

  // Query expiring count (<30 days) reactively
  const nowEpoch = Date.now();
  const thirtyDaysLimit = nowEpoch + 30 * 24 * 60 * 60 * 1000;
  const expiringCount = items.filter(i => {
    const expEpoch = new Date(i.expiryDate).getTime();
    return expEpoch >= nowEpoch && expEpoch <= thirtyDaysLimit;
  }).length;

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', name: 'Inventory & Ledger', icon: Boxes, badge: lowStockCount },
    { id: 'new-case', name: 'New Case (Log Use)', icon: FilePlus },
    { id: 'requisitions', name: 'Requisitions', icon: FileText },
    { id: 'reports', name: 'Reports & Auditing', icon: BarChart3, badge2: expiringCount },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col justify-between border-r border-slate-800 no-print">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-bold text-lg flex items-center justify-center w-10 h-10 shadow-md shadow-blue-500/20">
              CL
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white m-0 leading-none uppercase">Cath Lab</h1>
              <span className="text-[10px] text-slate-400 font-medium block mt-1 leading-tight">Inventory Management System</span>
            </div>
          </div>
          <div className="mt-2.5 text-[9px] text-slate-550 uppercase tracking-widest font-bold">
            SSMC Rewa
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                
                {/* Notification Badges */}
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    isActive ? 'bg-white text-blue-600' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}

                {item.badge2 !== undefined && item.badge2 > 0 ? (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    isActive ? 'bg-white text-blue-600' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {item.badge2}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        
        {/* Sign Out Button */}
        <div className="p-4 border-t border-slate-800/40">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-450" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2.5">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <p className="font-semibold text-slate-300">Supabase Cloud</p>
            <p className="text-[10px] text-slate-550">Realtime Sync Active</p>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-450 font-bold tracking-wider uppercase text-center">
          Designed by Dr V D Tripathi DM
        </div>
      </div>
    </aside>
  );
};
