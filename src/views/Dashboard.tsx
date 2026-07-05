import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Procedure } from '../db/db';
import { ProcedurePrintModal } from '../components/ProcedurePrintModal';
import { 
  IndianRupee, 
  AlertTriangle, 
  Calendar, 
  AlertOctagon, 
  FilePlus, 
  PlusCircle, 
  Activity, 
  TrendingDown
} from 'lucide-react';

interface DashboardProps {
  onViewChange: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const [activeProcedure, setActiveProcedure] = useState<Procedure | null>(null);
  // Live query for metrics
  const metrics = useLiveQuery(async () => {
    const items = await db.items.toArray();
    const procedures = await db.procedures.toArray();
    
    // 1. Total Stock Value
    const totalStockValue = items.reduce((acc, curr) => acc + (curr.currentQuantity * curr.unitCost), 0);
    
    // 2. Low Stock Count
    const lowStockCount = items.filter(i => i.currentQuantity <= i.reorderLevel).length;

    // 3. Expiring <30 Days (excluding already expired, or including expired? Let's check both)
    const nowEpoch = Date.now();
    const thirtyDaysLimit = nowEpoch + 30 * 24 * 60 * 60 * 1000;
    const expiringSoon = items.filter(i => {
      const expEpoch = new Date(i.expiryDate).getTime();
      return expEpoch <= thirtyDaysLimit;
    }).length;

    // 4. Cases this month
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const casesThisMonth = procedures.filter(p => p.date.startsWith(currentMonth));
    const casesCount = casesThisMonth.length;

    // 5. Over-ceiling cases this month
    const overCeilingCount = casesThisMonth.filter(p => p.overCeiling).length;

    // 6. Recent procedures (last 5)
    const recentProcedures = procedures
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.id || 0) - (a.id || 0))
      .slice(0, 5);

    return {
      totalStockValue,
      lowStockCount,
      expiringSoon,
      casesCount,
      overCeilingCount,
      recentProcedures
    };
  }, []) || {
    totalStockValue: 0,
    lowStockCount: 0,
    expiringSoon: 0,
    casesCount: 0,
    overCeilingCount: 0,
    recentProcedures: []
  };

  // Format currency in Indian Rupees style (Lakh / Crore spacing is ideal, or standard)
  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight m-0">Cath Lab Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time status of inventory and procedure cost control</p>
        </div>
        <div className="text-right text-xs text-slate-400 font-mono">
          System Date: {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Grid: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock Valuation</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-slate-800 font-mono">
              {formatRupees(metrics.totalStockValue)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Total cost of stock-on-hand</p>
          </div>
        </div>

        {/* Card 2: Low Stock */}
        <div className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-colors ${
          metrics.lowStockCount > 0 ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Items</span>
            <div className={`p-2 rounded-lg ${
              metrics.lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-xl font-bold font-mono ${
              metrics.lowStockCount > 0 ? 'text-red-700' : 'text-slate-850'
            }`}>
              {metrics.lowStockCount}
            </h3>
            <p className="text-xs text-slate-500 mt-1">At/below reorder level</p>
          </div>
        </div>

        {/* Card 3: Expiring Soon */}
        <div className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-colors ${
          metrics.expiringSoon > 0 ? 'border-amber-250 bg-amber-50/20' : 'border-slate-200'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiring / Expired</span>
            <div className={`p-2 rounded-lg ${
              metrics.expiringSoon > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-xl font-bold font-mono ${
              metrics.expiringSoon > 0 ? 'text-amber-700' : 'text-slate-800'
            }`}>
              {metrics.expiringSoon}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Expiring in next 30 days</p>
          </div>
        </div>

        {/* Card 4: Cases This Month */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cases (This Month)</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-slate-850 font-mono">
              {metrics.casesCount}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Procedures logged this month</p>
          </div>
        </div>

        {/* Card 5: Over Ceiling Cases */}
        <div className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-colors ${
          metrics.overCeilingCount > 0 ? 'border-rose-200 bg-rose-50/25' : 'border-slate-200'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Over-Ceiling Cases</span>
            <div className={`p-2 rounded-lg ${
              metrics.overCeilingCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-xl font-bold font-mono ${
              metrics.overCeilingCount > 0 ? 'text-rose-700' : 'text-slate-800'
            }`}>
              {metrics.overCeilingCount}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Package budget exceeded</p>
          </div>
        </div>
      </div>

      {/* Grid Layout: Actions and Recent list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Links / Actions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <h2 className="text-sm font-bold text-slate-700 mb-4 tracking-tight">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => onViewChange('new-case')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-blue-100 bg-blue-50/30 hover:bg-blue-50 text-left transition-all group"
              >
                <div className="p-3 bg-blue-500 text-white rounded-lg group-hover:scale-105 transition-transform">
                  <FilePlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-900 leading-tight">Log New Case</h4>
                  <p className="text-xs text-blue-600 mt-0.5">Deduct stock using templates</p>
                </div>
              </button>

              <button
                onClick={() => onViewChange('requisitions')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 text-left transition-all group"
              >
                <div className="p-3 bg-emerald-500 text-white rounded-lg group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 leading-tight">Create Requisition</h4>
                  <p className="text-xs text-emerald-600 mt-0.5">Stock replenishment workflow</p>
                </div>
              </button>
            </div>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Database Status: Active</span>
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px]">v1.0.0</span>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-700 tracking-tight m-0 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              Recent Procedures Logged
            </h2>
            <button 
              onClick={() => onViewChange('reports')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View Full Logs →
            </button>
          </div>

          <div className="overflow-x-auto">
            {metrics.recentProcedures.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No recent cases logged. Click "Log New Case" to get started.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/70 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Case ID</th>
                    <th className="py-2.5 px-3">Patient Ref</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Operator</th>
                    <th className="py-2.5 px-3 text-right">Cost</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {metrics.recentProcedures.map((proc) => (
                    <tr key={proc.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setActiveProcedure(proc)}>
                      <td className="py-2.5 px-3 text-slate-500">{proc.date}</td>
                      <td className="py-2.5 px-3 text-slate-900 font-semibold">{proc.caseId}</td>
                      <td className="py-2.5 px-3 text-slate-700">{proc.patientRef}</td>
                      <td className="py-2.5 px-3 text-slate-800">{proc.procedureType}</td>
                      <td className="py-2.5 px-3 text-slate-600">{proc.operator}</td>
                      <td className="py-2.5 px-3 text-right text-slate-900 font-mono font-semibold">
                        {formatRupees(proc.totalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {proc.overCeiling ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                            Over Ceiling
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Compliant
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {activeProcedure && (
        <ProcedurePrintModal 
          procedure={activeProcedure} 
          onClose={() => setActiveProcedure(null)} 
        />
      )}
    </div>
  );
};
