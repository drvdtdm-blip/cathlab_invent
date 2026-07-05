import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Item, type Procedure, type PmjayPackage, type LedgerEntry } from '../db/db';
import { 
  FilePlus, 
  Trash2, 
  Search, 
  AlertTriangle
} from 'lucide-react';

interface NewCaseProps {
  onSuccess: () => void;
}

interface SelectedItem {
  itemId: number;
  name: string;
  category: string;
  modelSize: string;
  batchLotNo: string;
  quantity: number; // qty to consume
  unitCost: number;
  currentQuantity: number; // max available stock
}

export const NewCase: React.FC<NewCaseProps> = ({ onSuccess }) => {
  // Queries
  const allItems = useLiveQuery(() => db.items.toArray(), []) || [];
  const pmjayPackages = useLiveQuery(() => db.pmjayPackages.toArray(), []) || [];

  // Form Fields
  const [caseId, setCaseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [patientRef, setPatientRef] = useState('');
  const [operator, setOperator] = useState('');
  const [procedureType, setProcedureType] = useState('PCI');
  const [selectedPackageId, setSelectedPackageId] = useState<number | undefined>(undefined);
  const [overCeilingReason, setOverCeilingReason] = useState('');

  // Selected Consumables list
  const [consumedList, setConsumedList] = useState<SelectedItem[]>([]);

  // Search Items state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Auto-load template on procedure type change
  useEffect(() => {
    if (pmjayPackages.length === 0 || allItems.length === 0) return;

    // Try to match procedure type with PMJAY package codes
    let matchedPkg: PmjayPackage | undefined;
    if (procedureType === 'PCI') matchedPkg = pmjayPackages.find(p => p.code.includes('PCI'));
    else if (procedureType === 'Pacemaker (PPI)') matchedPkg = pmjayPackages.find(p => p.code.includes('PPI'));
    else if (procedureType === 'BMV') matchedPkg = pmjayPackages.find(p => p.code.includes('BMV'));
    else if (procedureType === 'ASD device closure') matchedPkg = pmjayPackages.find(p => p.code.includes('ASD'));
    else if (procedureType === 'PDA device closure') matchedPkg = pmjayPackages.find(p => p.code.includes('PDA'));

    if (matchedPkg) {
      setSelectedPackageId(matchedPkg.id);
      loadTemplateConsumables(matchedPkg);
    } else {
      setSelectedPackageId(undefined);
      setConsumedList([]);
    }
  }, [procedureType, pmjayPackages, allItems]);

  const loadTemplateConsumables = (pkg: PmjayPackage) => {
    const list: SelectedItem[] = [];
    pkg.defaultConsumables.forEach(def => {
      const dbItem = allItems.find(i => i.id === def.itemId);
      if (dbItem && dbItem.id) {
        list.push({
          itemId: dbItem.id,
          name: dbItem.name,
          category: dbItem.category,
          modelSize: dbItem.modelSize,
          batchLotNo: dbItem.batchLotNo,
          quantity: def.quantity,
          unitCost: dbItem.unitCost,
          currentQuantity: dbItem.currentQuantity
        });
      }
    });
    setConsumedList(list);
  };

  // Trigger template reload manually if package changes
  const handlePackageChange = (pkgIdVal: string) => {
    const pkgId = pkgIdVal ? Number(pkgIdVal) : undefined;
    setSelectedPackageId(pkgId);
    
    if (pkgId) {
      const pkg = pmjayPackages.find(p => p.id === pkgId);
      if (pkg) {
        loadTemplateConsumables(pkg);
      }
    } else {
      setConsumedList([]);
    }
  };

  // Add Item to consumption list from search results
  const addSearchItemToList = (item: Item) => {
    if (!item.id) return;
    
    // Check if already in list
    const existing = consumedList.find(c => c.itemId === item.id);
    if (existing) {
      setConsumedList(consumedList.map(c => 
        c.itemId === item.id 
          ? { ...c, quantity: Math.min(c.quantity + 1, c.currentQuantity) } 
          : c
      ));
    } else {
      setConsumedList([...consumedList, {
        itemId: item.id,
        name: item.name,
        category: item.category,
        modelSize: item.modelSize,
        batchLotNo: item.batchLotNo,
        quantity: 1,
        unitCost: item.unitCost,
        currentQuantity: item.currentQuantity
      }]);
    }
    
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Modify quantity of item in list
  const updateItemQtyInList = (itemId: number, qty: number) => {
    setConsumedList(consumedList.map(c => 
      c.itemId === itemId 
        ? { ...c, quantity: qty }
        : c
    ));
  };

  // Remove Item from list
  const removeItemFromList = (itemId: number) => {
    setConsumedList(consumedList.filter(c => c.itemId !== itemId));
  };

  // Calculations
  const selectedPackage = pmjayPackages.find(p => p.id === selectedPackageId);
  const ceilingAmount = selectedPackage ? selectedPackage.ceilingAmount : 0;
  const totalCost = consumedList.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
  const overCeiling = ceilingAmount > 0 && totalCost > ceilingAmount;
  const variance = ceilingAmount - totalCost;

  // Search Results filtering
  const searchResults = allItems.filter(item => {
    if (!searchQuery) return false;
    // Don't show expired items or zero stock? Let's show them, but warn. Actually, better to show items with quantity > 0
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batchLotNo.toLowerCase().includes(searchQuery.toLowerCase())
    ) && item.currentQuantity > 0;
  }).slice(0, 5);

  // Form Submit
  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Core Validations
    if (!caseId || !patientRef || !operator) {
      alert("Please fill in Case ID, Patient Reference, and Operator name.");
      return;
    }
    if (consumedList.length === 0) {
      alert("Please add at least one consumable item to the case.");
      return;
    }
    if (overCeiling && !overCeilingReason.trim()) {
      alert("Consumable cost exceeds PMJAY ceiling. Please enter an Over-ceiling Justification Reason.");
      return;
    }

    // Verify stock availability
    let stockError = false;
    consumedList.forEach(c => {
      if (c.quantity > c.currentQuantity) {
        alert(`Insufficient stock for "${c.name}" (Batch: ${c.batchLotNo}). Requested: ${c.quantity}, Available: ${c.currentQuantity}.`);
        stockError = true;
      }
      if (c.quantity <= 0) {
        alert(`Quantity for item "${c.name}" must be greater than zero.`);
        stockError = true;
      }
    });
    if (stockError) return;

    try {
      await db.transaction('rw', [db.items, db.procedures, db.ledger], async () => {
        // 1. Deduct stock and write ledger entries
        for (const itemConsumed of consumedList) {
          const item = await db.items.get(itemConsumed.itemId);
          if (!item) throw new Error(`Item ${itemConsumed.name} not found in database.`);
          
          item.currentQuantity -= itemConsumed.quantity;
          await db.items.put(item);

          // Write ledger
          const ledger: LedgerEntry = {
            itemId: itemConsumed.itemId,
            itemName: itemConsumed.name,
            category: itemConsumed.category,
            timestamp: Date.now(),
            type: 'consumed',
            quantityChanged: -itemConsumed.quantity,
            quantityAfter: item.currentQuantity,
            operator: operator,
            referenceId: `CASE-${caseId}`,
            reason: overCeiling ? `Exceeded ceiling. Case Reason: ${overCeilingReason}` : undefined
          };
          await db.ledger.add(ledger);
        }

        // 2. Save Procedure Case
        const procedureCase: Procedure = {
          caseId,
          date,
          timestamp: Date.now(),
          patientRef,
          procedureType,
          operator,
          pmjayPackageId: selectedPackageId,
          pmjayPackageName: selectedPackage?.name,
          pmjayCeilingAmount: ceilingAmount,
          itemsConsumed: consumedList.map(c => ({
            itemId: c.itemId,
            name: c.name,
            category: c.category,
            modelSize: c.modelSize,
            batchLotNo: c.batchLotNo,
            quantity: c.quantity,
            unitCost: c.unitCost
          })),
          totalCost,
          overCeiling,
          overCeilingReason: overCeiling ? overCeilingReason : undefined
        };

        await db.procedures.add(procedureCase);
      });

      alert("Case consumption logged successfully! Stock quantities have been decremented.");
      onSuccess(); // Navigate back to Dashboard or refresh
    } catch (err) {
      console.error("Error saving procedure case:", err);
      alert("Failed to save procedure case. Transaction rolled back.");
    }
  };

  // Format currency
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
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight m-0">Log Per-Procedure Consumption</h1>
        <p className="text-sm text-slate-500">Record item usage for clinical audit trails and PMJAY package calculations</p>
      </div>

      <form onSubmit={handleSaveCase} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Left Column: Case Details */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">
              Case Information
            </h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Case ID / IPD No *</label>
              <input
                type="text"
                required
                placeholder="e.g. C-2026-001"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Ref (Initials + UHID) *</label>
              <input
                type="text"
                required
                placeholder="e.g. VT / 448291"
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Do NOT enter full names. Initials + Hospital ID only.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Procedure Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Procedure Type *</label>
              <select
                value={procedureType}
                onChange={(e) => setProcedureType(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-medium"
              >
                <option value="PCI">PCI (Stenting)</option>
                <option value="Pacemaker (PPI)">Pacemaker (PPI)</option>
                <option value="BMV">BMV (Mitral Balloon)</option>
                <option value="ASD device closure">ASD Device Closure</option>
                <option value="PDA device closure">PDA Device Closure</option>
                <option value="Custom">Custom / Other Procedure</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">PMJAY Billing Package</label>
              <select
                value={selectedPackageId || ''}
                onChange={(e) => handlePackageChange(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-medium"
              >
                <option value="">No Package / Cash billing</option>
                {pmjayPackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.code} - {pkg.name} ({formatRupees(pkg.ceilingAmount)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Case Operator Name *</label>
              <input
                type="text"
                required
                placeholder="Logging Operator / Scrub Nurse"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full p-2 border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm font-semibold"
              />
            </div>
          </div>

          {/* PMJAY Cost Status Card */}
          {selectedPackage && (
            <div className={`p-5 rounded-xl border shadow-sm space-y-3 ${
              overCeiling ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-250'
            }`}>
              <h3 className="text-xs font-bold text-slate-750 uppercase tracking-wider">
                PMJAY Package Budget Status
              </h3>
              
              <div className="grid grid-cols-2 gap-y-2 text-xs font-medium">
                <span className="text-slate-500">Package Budget:</span>
                <span className="text-right font-mono font-bold text-slate-800">{formatRupees(ceilingAmount)}</span>
                
                <span className="text-slate-500">Consumables Cost:</span>
                <span className="text-right font-mono font-bold text-slate-800">{formatRupees(totalCost)}</span>

                <span className="text-slate-500">Variance:</span>
                <span className={`text-right font-mono font-bold ${variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {variance >= 0 ? `+${formatRupees(variance)}` : formatRupees(variance)}
                </span>
              </div>

              {overCeiling && (
                <div className="space-y-2 pt-2 border-t border-rose-200">
                  <div className="flex gap-2 text-xs text-rose-800 font-bold items-start">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>OVER CEILING LIMIT! Exceeded by {formatRupees(Math.abs(variance))}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1">
                      Over-Ceiling Justification * (Mandatory)
                    </label>
                    <textarea
                      required
                      placeholder="Specify clinical reasons (e.g. 'Highly calcified lesion requiring additional scoring balloon + 2 drug-eluting stents')"
                      value={overCeilingReason}
                      onChange={(e) => setOverCeilingReason(e.target.value)}
                      rows={3}
                      className="w-full p-2 border border-rose-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Consumables Selector & Table */}
        <div className="space-y-4 lg:col-span-2">
          {/* Add Item searcher */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">
              Consumables Logged
            </h2>

            {/* Search items bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search and add additional items (e.g. wires, stents, balloons)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
              />

              {/* Search Results Dropdown */}
              {showSearchResults && searchQuery && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden divide-y divide-slate-100">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching items in catalog with available stock
                    </div>
                  ) : (
                    searchResults.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addSearchItemToList(item)}
                        className="w-full text-left p-3 hover:bg-slate-50 flex justify-between items-center text-xs transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-450 mt-0.5">
                            Batch: {item.batchLotNo} | Size: {item.modelSize} | Loc: {item.storageLocation}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-700">Stock: <span className="font-bold text-slate-900">{item.currentQuantity}</span></div>
                          <div className="text-[10px] text-slate-500 font-mono">{formatRupees(item.unitCost)}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Consumables Table */}
            <div className="mt-4 border border-slate-150 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Item Details</th>
                    <th className="py-2.5 px-3">Batch/Size</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-center w-24">Consume Qty</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                    <th className="py-2.5 px-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {consumedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No consumables selected. Pick a procedure type above or search to add items.
                      </td>
                    </tr>
                  ) : (
                    consumedList.map(item => {
                      const lineTotal = item.quantity * item.unitCost;
                      const hasStockWarning = item.quantity > item.currentQuantity;
                      
                      return (
                        <tr key={item.itemId} className={hasStockWarning ? 'bg-red-50/30' : ''}>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{item.name}</div>
                            <div className="text-[9px] text-slate-400 uppercase font-semibold">{item.category}</div>
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-mono">
                            <div>Batch: {item.batchLotNo}</div>
                            <div>Size: {item.modelSize}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {formatRupees(item.unitCost)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="space-y-1">
                              <input
                                type="number"
                                required
                                min="1"
                                max={item.currentQuantity}
                                value={item.quantity}
                                onChange={(e) => updateItemQtyInList(item.itemId, Number(e.target.value))}
                                className="w-16 p-1 border border-slate-200 rounded text-center font-mono font-bold"
                              />
                              <div className="text-[9px] text-slate-500">
                                Stock: <span className="font-bold">{item.currentQuantity}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-850">
                            {formatRupees(lineTotal)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemFromList(item.itemId)}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-slate-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Cost Summary Panel */}
            {consumedList.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Consumables Cost</span>
                <span className="text-lg font-bold text-slate-900 font-mono">{formatRupees(totalCost)}</span>
              </div>
            )}

            {/* Form submission controls */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onSuccess}
                className="px-4 py-2 border border-slate-250 text-slate-750 font-bold rounded-lg hover:bg-slate-50 text-xs"
              >
                Discard / Cancel
              </button>
              
              <button
                type="submit"
                disabled={overCeiling && !overCeilingReason.trim()}
                className={`px-5 py-2.5 font-bold rounded-lg shadow-sm text-xs flex items-center gap-2 text-white ${
                  overCeiling && !overCeilingReason.trim()
                    ? 'bg-slate-350 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <FilePlus className="w-4 h-4" /> Save Case & Deduct Stock
              </button>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
};
