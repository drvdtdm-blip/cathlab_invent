import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Procedure } from '../db/db';
import { exportToCSV } from '../utils/csv';
import { ProcedurePrintModal } from '../components/ProcedurePrintModal';
import { 
  BarChart3, 
  IndianRupee, 
  Clock, 
  TrendingDown, 
  History, 
  Download, 
  Printer, 
  AlertTriangle
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [activeProcedure, setActiveProcedure] = useState<Procedure | null>(null);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  // Queries
  const items = useLiveQuery(() => db.items.toArray(), []) || [];
  const procedures = useLiveQuery(() => db.procedures.toArray(), []) || [];
  const ledger = useLiveQuery(() => db.ledger.toArray(), []) || [];
  const pmjayPackages = useLiveQuery(() => db.pmjayPackages.toArray(), []) || [];

  // Active Report Tab
  const [activeTab, setActiveTab] = useState<'valuation' | 'consumption' | 'expiry' | 'variance' | 'ledger'>('valuation');

  // Ledger Filter states
  const [ledgerStartDate, setLedgerStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 30 days ago
  const [ledgerEndDate, setLedgerEndDate] = useState(new Date().toISOString().split('T')[0]); // today
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('');

  // Consumption Grouping state
  const [consumptionGroup, setConsumptionGroup] = useState<'procedureType' | 'operator' | 'month'>('procedureType');

  // Format currency
  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // ==================== 1. Valuation Calculations ====================
  const valuationData = items.map(item => ({
    name: item.name,
    category: item.category,
    manufacturer: item.manufacturer,
    modelSize: item.modelSize,
    batchLotNo: item.batchLotNo,
    storageLocation: item.storageLocation,
    currentQuantity: item.currentQuantity,
    unitCost: item.unitCost,
    totalValuation: item.currentQuantity * item.unitCost
  }));
  
  const grandTotalValuation = valuationData.reduce((acc, curr) => acc + curr.totalValuation, 0);

  const handleExportValuation = () => {
    const headers = [
      { key: 'name', label: 'Item Name' },
      { key: 'category', label: 'Category' },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'modelSize', label: 'Model/Size' },
      { key: 'batchLotNo', label: 'Batch No' },
      { key: 'storageLocation', label: 'Location' },
      { key: 'currentQuantity', label: 'Qty' },
      { key: 'unitCost', label: 'Unit Cost' },
      { key: 'totalValuation', label: 'Total Valuation' },
    ];
    exportToCSV(valuationData as any[], headers as any[], 'stock_valuation');
  };

  // ==================== 2. Consumption Calculations ====================
  const getConsumptionGrouped = () => {
    const groups: Record<string, { key: string; cases: number; totalCost: number }> = {};
    
    procedures.forEach(proc => {
      let groupKey = '';
      if (consumptionGroup === 'procedureType') groupKey = proc.procedureType;
      else if (consumptionGroup === 'operator') groupKey = proc.operator;
      else if (consumptionGroup === 'month') groupKey = proc.date.substring(0, 7); // YYYY-MM

      if (!groups[groupKey]) {
        groups[groupKey] = { key: groupKey, cases: 0, totalCost: 0 };
      }
      groups[groupKey].cases += 1;
      groups[groupKey].totalCost += proc.totalCost;
    });

    return Object.values(groups).sort((a, b) => b.totalCost - a.totalCost);
  };

  const consumptionData = getConsumptionGrouped();

  const handleExportConsumption = () => {
    const headers = [
      { key: 'key', label: consumptionGroup === 'procedureType' ? 'Procedure Type' : consumptionGroup === 'operator' ? 'Operator' : 'Month' },
      { key: 'cases', label: 'Total Cases' },
      { key: 'totalCost', label: 'Total Consumable Cost' }
    ];
    exportToCSV(consumptionData, headers, `consumption_by_${consumptionGroup}`);
  };

  // ==================== 3. Expiry Calculations ====================
  const getExpiryData = () => {
    const now = Date.now();
    return items.map(item => {
      const exp = new Date(item.expiryDate).getTime();
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      
      let status: 'expired' | '30' | '60' | '90' | 'safe' = 'safe';
      if (diffDays < 0) status = 'expired';
      else if (diffDays <= 30) status = '30';
      else if (diffDays <= 60) status = '60';
      else if (diffDays <= 90) status = '90';

      return {
        ...item,
        daysToExpiry: diffDays,
        status
      };
    }).filter(i => i.status !== 'safe').sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  };

  const expiryData = getExpiryData();

  const handleExportExpiry = () => {
    const headers = [
      { key: 'name', label: 'Item Name' },
      { key: 'category', label: 'Category' },
      { key: 'batchLotNo', label: 'Batch No' },
      { key: 'expiryDate', label: 'Expiry Date' },
      { key: 'daysToExpiry', label: 'Days Remaining' },
      { key: 'currentQuantity', label: 'Stock Qty' }
    ];
    exportToCSV(expiryData, headers, 'expiring_expired_stock');
  };

  // ==================== 4. PMJAY Variance Calculations ====================
  const getVarianceData = () => {
    // 1. Package summary
    const summaries = pmjayPackages.map(pkg => {
      const linkedCases = procedures.filter(p => p.pmjayPackageId === pkg.id);
      const totalCostSum = linkedCases.reduce((sum, c) => sum + c.totalCost, 0);
      const avgCost = linkedCases.length > 0 ? totalCostSum / linkedCases.length : 0;
      
      return {
        code: pkg.code,
        name: pkg.name,
        ceiling: pkg.ceilingAmount,
        casesCount: linkedCases.length,
        avgCost: avgCost,
        variance: pkg.ceilingAmount - avgCost
      };
    });

    // 2. Over ceiling list
    const overCeilingCases = procedures
      .filter(p => p.overCeiling)
      .map(p => ({
        caseId: p.caseId,
        date: p.date,
        patientRef: p.patientRef,
        procedureType: p.procedureType,
        operator: p.operator,
        packageName: p.pmjayPackageName || 'N/A',
        ceiling: p.pmjayCeilingAmount || 0,
        actualCost: p.totalCost,
        variance: (p.pmjayCeilingAmount || 0) - p.totalCost,
        reason: p.overCeilingReason || 'No justification provided',
        originalProcedure: p
      }));

    return { summaries, overCeilingCases };
  };

  const { summaries: varianceSummaries, overCeilingCases } = getVarianceData();

  const handleExportVariance = () => {
    const headers = [
      { key: 'code', label: 'Package Code' },
      { key: 'name', label: 'Package Name' },
      { key: 'ceiling', label: 'Ceiling' },
      { key: 'casesCount', label: 'Cases Count' },
      { key: 'avgCost', label: 'Average Cost' },
      { key: 'variance', label: 'Variance (Ceiling - Avg)' }
    ];
    exportToCSV(varianceSummaries, headers, 'pmjay_package_variance');
  };

  const handleExportOverCeiling = () => {
    const headers = [
      { key: 'caseId', label: 'Case ID' },
      { key: 'date', label: 'Date' },
      { key: 'patientRef', label: 'Patient Ref' },
      { key: 'procedureType', label: 'Procedure' },
      { key: 'operator', label: 'Operator' },
      { key: 'packageName', label: 'Package' },
      { key: 'ceiling', label: 'Ceiling' },
      { key: 'actualCost', label: 'Actual Cost' },
      { key: 'variance', label: 'Excess Amount' },
      { key: 'reason', label: 'Justification Reason' }
    ];
    exportToCSV(overCeilingCases, headers, 'over_ceiling_procedures');
  };

  const handleExportMonthlyClaims = () => {
    const monthlyCases = procedures.filter(p => p.date.startsWith(exportMonth));
    if (monthlyCases.length === 0) {
      alert(`No cases logged for the month ${exportMonth}.`);
      return;
    }
    
    const exportData = monthlyCases.map(p => {
      const itemsListStr = p.itemsConsumed
        .map(i => `${i.name} (Batch: ${i.batchLotNo}, Qty: ${i.quantity}, Cost: ${formatRupees(i.unitCost)})`)
        .join('; ');
        
      return {
        'Case ID': p.caseId,
        'Date': p.date,
        'Patient Reference': p.patientRef,
        'Procedure Type': p.procedureType,
        'Consultant Cardiologist': p.operator,
        'Technician (Data Entry)': p.technician || '—',
        'Linked PMJAY Package': p.pmjayPackageName || 'N/A (General)',
        'Ceiling Limit (INR)': p.pmjayCeilingAmount || 0,
        'Actual Consumables Cost (INR)': p.totalCost,
        'Is Over Ceiling': p.overCeiling ? 'YES' : 'NO',
        'Over-Ceiling Justification': p.overCeilingReason || '—',
        'Consumed Items Details': itemsListStr
      };
    });

    const headers = [
      { key: 'Case ID', label: 'Case ID' },
      { key: 'Date', label: 'Date' },
      { key: 'Patient Reference', label: 'Patient Reference' },
      { key: 'Procedure Type', label: 'Procedure Type' },
      { key: 'Consultant Cardiologist', label: 'Consultant Cardiologist' },
      { key: 'Technician (Data Entry)', label: 'Technician (Data Entry)' },
      { key: 'Linked PMJAY Package', label: 'Linked PMJAY Package' },
      { key: 'Ceiling Limit (INR)', label: 'Ceiling Limit (INR)' },
      { key: 'Actual Consumables Cost (INR)', label: 'Actual Consumables Cost (INR)' },
      { key: 'Is Over Ceiling', label: 'Is Over Ceiling' },
      { key: 'Over-Ceiling Justification', label: 'Over-Ceiling Justification' },
      { key: 'Consumed Items Details', label: 'Consumed Items Details' }
    ];

    exportToCSV(exportData, headers, `PMJAY_Claims_Report_${exportMonth}`);
  };

  // ==================== 5. Audit Ledger Calculations ====================
  const getFilteredLedger = () => {
    return ledger.filter(log => {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      const matchesDate = logDate >= ledgerStartDate && logDate <= ledgerEndDate;
      const matchesType = !ledgerTypeFilter || log.type === ledgerTypeFilter;
      return matchesDate && matchesType;
    }).sort((a, b) => b.timestamp - a.timestamp);
  };

  const filteredLedger = getFilteredLedger();

  const handleExportLedger = () => {
    const headers = [
      { key: 'timestamp', label: 'Timestamp' },
      { key: 'itemId', label: 'Item ID' },
      { key: 'itemName', label: 'Item Name' },
      { key: 'category', label: 'Category' },
      { key: 'type', label: 'Action' },
      { key: 'quantityChanged', label: 'Qty Change' },
      { key: 'quantityAfter', label: 'Stock After' },
      { key: 'operator', label: 'Operator' },
      { key: 'referenceId', label: 'Reference' },
      { key: 'reason', label: 'Justification Reason' }
    ];
    
    // Format timestamp before exporting
    const formattedData = filteredLedger.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp).toLocaleString('en-IN')
    }));

    exportToCSV(formattedData, headers, `stock_ledger_audit_log`);
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header - Hidden during print */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight m-0">Reports & Audit Desk</h1>
          <p className="text-sm text-slate-500">Official hospital compliance records, valuations, and package variances</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-slate-850 hover:bg-slate-950 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          <Printer className="w-4 h-4" /> Print Current Tab
        </button>
      </div>

      {/* Tabs Menu - Hidden during print */}
      <div className="flex border-b border-slate-200 no-print">
        <button
          onClick={() => setActiveTab('valuation')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === 'valuation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-505 hover:text-slate-800'
          }`}
        >
          <IndianRupee className="w-4 h-4" /> Stock Valuation
        </button>
        <button
          onClick={() => setActiveTab('consumption')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === 'consumption' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-505 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Consumption Analytics
        </button>
        <button
          onClick={() => setActiveTab('expiry')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === 'expiry' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-505 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> Expiry Tracker
        </button>
        <button
          onClick={() => setActiveTab('variance')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === 'variance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-505 hover:text-slate-800'
          }`}
        >
          <TrendingDown className="w-4 h-4" /> PMJAY Cost Variance
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === 'ledger' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-505 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" /> Audit Stock Ledger
        </button>
      </div>

      {/* ========================================================================= */}
      {/* Tab Content: Valuation */}
      {/* ========================================================================= */}
      {activeTab === 'valuation' && (
        <div className="space-y-4 print-only-container text-left">
          <div className="flex justify-between items-center no-print">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Stock-on-Hand Valuation</h3>
            <button
              onClick={handleExportValuation}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 py-1.5 px-3 rounded border border-blue-150"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Print Letterhead block */}
          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-6">
            <h2 className="text-base font-bold uppercase font-serif">DEPARTMENT OF CARDIOLOGY</h2>
            <h3 className="text-xs font-bold uppercase font-serif">SHYAM SHAH MEDICAL COLLEGE & ASSOCIATED HOSPITALS, REWA</h3>
            <p className="text-[10px] text-slate-550 mt-1">Stock-On-Hand Valuation Statement — Generated {new Date().toLocaleDateString()}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Item Name</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Manufacturer</th>
                    <th className="py-2.5 px-4">Size/Model</th>
                    <th className="py-2.5 px-4">Batch No</th>
                    <th className="py-2.5 px-4 text-center">Current Qty</th>
                    <th className="py-2.5 px-4 text-right">Unit Cost</th>
                    <th className="py-2.5 px-4 text-right">Total Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {valuationData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 text-slate-900 font-semibold">{item.name}</td>
                      <td className="py-2.5 px-4 text-slate-650 uppercase font-bold text-[10px]">{item.category}</td>
                      <td className="py-2.5 px-4 text-slate-600">{item.manufacturer}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">{item.modelSize}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">{item.batchLotNo}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-800">{item.currentQuantity}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700">{formatRupees(item.unitCost)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatRupees(item.totalValuation)}</td>
                    </tr>
                  ))}
                  
                  {/* Valuation Summary Row */}
                  <tr className="bg-slate-900 text-white font-bold font-mono">
                    <td colSpan={7} className="py-3.5 px-4 text-right text-xs uppercase tracking-wider">Grand Total Valuation</td>
                    <td className="py-3.5 px-4 text-right text-sm">{formatRupees(grandTotalValuation)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {/* Official Signatures for records */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-16 text-xs font-sans font-medium text-slate-700">
            <div>
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Prepared by: Cath Lab Store In-charge
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Verified by: HOD, Cardiology
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Tab Content: Consumption Analytics */}
      {/* ========================================================================= */}
      {activeTab === 'consumption' && (
        <div className="space-y-4 print-only-container text-left">
          <div className="flex justify-between items-center no-print">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Group By:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-205">
                {(['procedureType', 'operator', 'month'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => setConsumptionGroup(option)}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-colors ${
                      consumptionGroup === option 
                        ? 'bg-white text-slate-850 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    {option === 'procedureType' ? 'Procedure' : option === 'operator' ? 'Operator' : 'Month'}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleExportConsumption}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 py-1.5 px-3 rounded border border-blue-150"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-6">
            <h2 className="text-base font-bold uppercase font-serif">DEPARTMENT OF CARDIOLOGY</h2>
            <h3 className="text-xs font-bold uppercase font-serif">SHYAM SHAH MEDICAL COLLEGE & ASSOCIATED HOSPITALS, REWA</h3>
            <p className="text-[10px] text-slate-550 mt-1">
              Consumables Consumption Report (Grouped by {consumptionGroup}) — Generated {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print-card">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50 uppercase tracking-wider">
                  <th className="py-2.5 px-4">
                    {consumptionGroup === 'procedureType' ? 'Procedure Type' : consumptionGroup === 'operator' ? 'Operator Name' : 'Calendar Month'}
                  </th>
                  <th className="py-2.5 px-4 text-center">Cases Count</th>
                  <th className="py-2.5 px-4 text-right">Total Consumables Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {consumptionData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-slate-400">
                      No case data recorded yet.
                    </td>
                  </tr>
                ) : (
                  consumptionData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">{row.key}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-800">{row.cases}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatRupees(row.totalCost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Official Signatures for records */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-16 text-xs font-sans font-medium text-slate-700">
            <div>
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Prepared by: Cath Lab Store In-charge
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Verified by: HOD, Cardiology
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Tab Content: Expiry Tracker */}
      {/* ========================================================================= */}
      {activeTab === 'expiry' && (
        <div className="space-y-4 print-only-container text-left">
          <div className="flex justify-between items-center no-print">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Expiring and Expired Inventory Desk</h3>
            <button
              onClick={handleExportExpiry}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 py-1.5 px-3 rounded border border-blue-150"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-6">
            <h2 className="text-base font-bold uppercase font-serif">DEPARTMENT OF CARDIOLOGY</h2>
            <h3 className="text-xs font-bold uppercase font-serif">SHYAM SHAH MEDICAL COLLEGE & ASSOCIATED HOSPITALS, REWA</h3>
            <p className="text-[10px] text-slate-550 mt-1">Expiry Audit Registry — Generated {new Date().toLocaleDateString()}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print-card">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Batch No</th>
                  <th className="py-2.5 px-4">Expiry Date</th>
                  <th className="py-2.5 px-4 text-center">Remaining Days</th>
                  <th className="py-2.5 px-4 text-center">Current Qty</th>
                  <th className="py-2.5 px-4 text-center">Status Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {expiryData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No stock currently expiring within 90 days. Excellent!
                    </td>
                  </tr>
                ) : (
                  expiryData.map((item, idx) => {
                    let color = 'bg-red-50 text-red-700 border-red-100';
                    let label = `${item.daysToExpiry} Days`;

                    if (item.status === 'expired') {
                      label = 'EXPIRED';
                    } else if (item.status === '30') {
                      color = 'bg-red-100 text-red-800 font-bold border-red-200';
                    } else if (item.status === '60') {
                      color = 'bg-amber-50 text-amber-700 border-amber-100';
                    } else if (item.status === '90') {
                      color = 'bg-yellow-50 text-yellow-750 border-yellow-150';
                    }

                    return (
                      <tr key={idx} className={item.status === 'expired' ? 'bg-red-50/15' : ''}>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                        <td className="py-3 px-4 text-slate-650 uppercase font-bold text-[10px]">{item.category}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{item.batchLotNo}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{item.expiryDate}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {item.status === 'expired' ? (
                            <span className="text-red-655 font-black flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Already Expired
                            </span>
                          ) : (
                            `${item.daysToExpiry} days`
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{item.currentQuantity}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${color}`}>
                            {label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Official Signatures for records */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-16 text-xs font-sans font-medium text-slate-700">
            <div>
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Prepared by: Cath Lab Store In-charge
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Verified by: HOD, Cardiology
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Tab Content: PMJAY Cost Variance */}
      {/* ========================================================================= */}
      {activeTab === 'variance' && (
        <div className="space-y-6 print-only-container text-left">
          
          {/* Monthly Claims CSV Export Panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 no-print">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider m-0 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-500" />
              Monthly Claims Audit Export Desk
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export all logged procedure consumable files for a specific month as a formatted CSV claims registry spreadsheet to submit directly to State Health Authorities for PMJAY claims reimbursement auditing.
            </p>
            <div className="flex flex-col sm:flex-row items-end gap-3 max-w-md">
              <div className="flex-1 w-full">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Select Billing Month
                </label>
                <input
                  type="month"
                  value={exportMonth}
                  onChange={(e) => setExportMonth(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleExportMonthlyClaims}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 w-full sm:w-auto shadow-sm shadow-blue-500/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export Claims CSV
              </button>
            </div>
          </div>

          {/* Section 1: Package aggregations */}
          <div className="space-y-3">
            <div className="flex justify-between items-center no-print">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">PMJAY Package Analytics</h3>
              <button
                onClick={handleExportVariance}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 py-1.5 px-3 rounded border border-blue-150"
              >
                <Download className="w-3.5 h-3.5" /> Export Variance CSV
              </button>
            </div>

            <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-6">
              <h2 className="text-base font-bold uppercase font-serif">DEPARTMENT OF CARDIOLOGY</h2>
              <h3 className="text-xs font-bold uppercase font-serif">SHYAM SHAH MEDICAL COLLEGE & ASSOCIATED HOSPITALS, REWA</h3>
              <p className="text-[10px] text-slate-550 mt-1">PMJAY Package Cost Variance Audit Sheet — Generated {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print-card">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Package Code</th>
                    <th className="py-2.5 px-4">Package Name</th>
                    <th className="py-2.5 px-4 text-right">Ceiling Amount</th>
                    <th className="py-2.5 px-4 text-center">Cases Logged</th>
                    <th className="py-2.5 px-4 text-right">Avg Consumables Cost</th>
                    <th className="py-2.5 px-4 text-right font-bold">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {varianceSummaries.map((pkg, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">{pkg.code}</td>
                      <td className="py-3 px-4 text-slate-700">{pkg.name}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatRupees(pkg.ceiling)}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-800">{pkg.casesCount}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {pkg.casesCount > 0 ? formatRupees(pkg.avgCost) : '—'}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        pkg.casesCount === 0 ? 'text-slate-400' : pkg.variance >= 0 ? 'text-emerald-700' : 'text-red-750'
                      }`}>
                        {pkg.casesCount > 0 ? (
                          pkg.variance >= 0 ? `+${formatRupees(pkg.variance)}` : formatRupees(pkg.variance)
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Over Ceiling justifications ledger */}
          <div className="space-y-3 pt-6 border-t border-slate-200">
            <div className="flex justify-between items-center no-print">
              <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Over-Ceiling Exceedance Audit Log
              </h3>
              <button
                onClick={handleExportOverCeiling}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 py-1.5 px-3 rounded border border-rose-150"
              >
                <Download className="w-3.5 h-3.5" /> Export Over-Ceiling CSV
              </button>
            </div>

            <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden print-card">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-rose-200 text-rose-700 font-bold bg-rose-50/50 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Case ID</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Patient Ref</th>
                    <th className="py-2.5 px-4">Package</th>
                    <th className="py-2.5 px-4 text-right">Ceiling</th>
                    <th className="py-2.5 px-4 text-right">Actual Cost</th>
                    <th className="py-2.5 px-4 text-right">Excess</th>
                    <th className="py-2.5 px-4">Operator</th>
                    <th className="py-2.5 px-4">Clinical Justification Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-805">
                  {overCeilingCases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        No procedures have exceeded their PMJAY ceilings. Compliant!
                      </td>
                    </tr>
                  ) : (
                    overCeilingCases.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setActiveProcedure(c.originalProcedure)}>
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono">{c.caseId}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{c.date}</td>
                        <td className="py-3 px-4 font-mono">{c.patientRef}</td>
                        <td className="py-3 px-4 text-slate-700">{c.packageName}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">{formatRupees(c.ceiling)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">{formatRupees(c.actualCost)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-650 bg-rose-50/20">
                          {formatRupees(Math.abs(c.variance))}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{c.operator}</td>
                        <td className="py-3 px-4 italic text-slate-850 font-serif bg-rose-50/10">
                          "{c.reason}"
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Official Signatures for records */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-16 text-xs font-sans font-medium text-slate-700">
            <div>
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Prepared by: Cath Lab Store In-charge
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Verified by: HOD, Cardiology
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Tab Content: Audit Stock Ledger */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4 print-only-container text-left">
          {/* Controls Bar - Hidden during print */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 items-end no-print font-sans">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                value={ledgerStartDate}
                onChange={(e) => setLedgerStartDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                value={ledgerEndDate}
                onChange={(e) => setLedgerEndDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Action Type</label>
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="">All Actions</option>
                <option value="received">Received</option>
                <option value="consumed">Consumed</option>
                <option value="adjusted">Adjusted</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleExportLedger}
                className="flex items-center justify-center gap-1.5 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Export Ledger CSV
              </button>
            </div>
          </div>

          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-6">
            <h2 className="text-base font-bold uppercase font-serif">DEPARTMENT OF CARDIOLOGY</h2>
            <h3 className="text-xs font-bold uppercase font-serif">SHYAM SHAH MEDICAL COLLEGE & ASSOCIATED HOSPITALS, REWA</h3>
            <p className="text-[10px] text-slate-550 mt-1">
              Active Stock Ledger Audit Trail Registry ({ledgerStartDate} to {ledgerEndDate}) — Generated {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Audit trail table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print-card">
            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-505 font-bold bg-slate-50 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date/Time</th>
                    <th className="py-2.5 px-3">Item Details</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                    <th className="py-2.5 px-3 text-center">Qty Change</th>
                    <th className="py-2.5 px-3 text-center">Balance After</th>
                    <th className="py-2.5 px-3">Operator</th>
                    <th className="py-2.5 px-3 font-mono">Reference</th>
                    <th className="py-2.5 px-3">Justification Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-750">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-450">
                        No transactions logged within the chosen filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((log) => {
                      let badgeStyle = 'bg-slate-100 text-slate-700';
                      if (log.type === 'received') badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                      if (log.type === 'consumed') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-100';
                      if (log.type === 'expired') badgeStyle = 'bg-red-50 text-red-700 border-red-100';
                      if (log.type === 'adjusted') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-100';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 align-top">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                            {new Date(log.timestamp).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 leading-tight">
                            {log.itemName}
                          </td>
                          <td className="py-2.5 px-3 text-[10px] uppercase font-bold text-slate-450">{log.category}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${badgeStyle}`}>
                              {log.type}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-bold ${
                            log.quantityChanged > 0 ? 'text-emerald-755' : 'text-red-555'
                          }`}>
                            {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                            {log.quantityAfter}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{log.operator}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 font-bold">{log.referenceId || '—'}</td>
                          <td className="py-2.5 px-3 italic text-slate-600 font-serif leading-tight">
                            {log.reason ? `"${log.reason}"` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Official Signatures for records */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-16 text-xs font-sans font-medium text-slate-700">
            <div>
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Prepared by: Cath Lab Store In-charge
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="border-t border-slate-500 pt-2 w-48 text-center">
                Verified by: HOD, Cardiology
              </div>
            </div>
          </div>
        </div>
      )}

      {activeProcedure && (
        <ProcedurePrintModal 
          procedure={activeProcedure} 
          onClose={() => setActiveProcedure(null)} 
        />
      )}
    </div>
  );
};
