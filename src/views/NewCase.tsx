import React, { useState, useEffect } from 'react';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { db, type Item, type Procedure, type LedgerEntry, type PmjayPackage } from '../db/db';
import { 
  FilePlus, 
  Trash2, 
  Search, 
  AlertTriangle,
  X,
  Save,
  Plus
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
  const { data: allItems = [] } = useSupabaseTable<Item>('items');
  const { data: pmjayPackages = [] } = useSupabaseTable<PmjayPackage>('pmjay_packages');

  // Form Fields
  const [caseId, setCaseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [patientRef, setPatientRef] = useState('');
  const [operator, setOperator] = useState(''); // Consultant Cardiologist
  const [technician, setTechnician] = useState(''); // Catheterization Technician (Data Entry)
  const [procedureType, setProcedureType] = useState('PCI');
  const [cathLab, setCathLab] = useState<'Cathlab 1' | 'Cathlab 2'>('Cathlab 1');
  const [selectedPackageId, setSelectedPackageId] = useState<number | undefined>(undefined);
  const [overCeilingReason, setOverCeilingReason] = useState('');

  // Selected Consumables list
  const [consumedList, setConsumedList] = useState<SelectedItem[]>([]);

  // Search Items state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Local Memory for operators & technicians
  const [rememberedConsultants, setRememberedConsultants] = useState<string[]>([]);
  const [rememberedTechnicians, setRememberedTechnicians] = useState<string[]>([]);

  // Custom Item Modal State
  const [isOpenCustomItemModal, setIsOpenCustomItemModal] = useState(false);
  const [cName, setCName] = useState('');
  const [cCategory, setCCategory] = useState('stent');
  const [cManufacturer, setCManufacturer] = useState('');
  const [cSize, setCSize] = useState('');
  const [cBatch, setCBatch] = useState('');
  const [cExpiry, setCExpiry] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [cCost, setCCost] = useState<number>(0);
  const [cLoc, setCLoc] = useState('');
  const [cQty, setCQty] = useState<number>(1);

  // Load local memory on mount
  useEffect(() => {
    const cons = JSON.parse(localStorage.getItem('cathlab_consultants') || '[]');
    const techs = JSON.parse(localStorage.getItem('cathlab_technicians') || '[]');
    setRememberedConsultants(cons);
    setRememberedTechnicians(techs);
  }, []);

  // Auto-load template on procedure type change
  useEffect(() => {
    if (pmjayPackages.length === 0 || allItems.length === 0) return;

    // Try to auto-select package matching the procedure type
    const matchingPkg = pmjayPackages.find(p => p.code.toLowerCase().includes(procedureType.toLowerCase()) || p.name.toLowerCase().includes(procedureType.toLowerCase()));
    if (matchingPkg) {
      setSelectedPackageId(matchingPkg.id);
    } else {
      setSelectedPackageId(undefined);
      setConsumedList([]);
    }
  }, [procedureType, pmjayPackages]);

  // Load package defaults when package selection changes
  useEffect(() => {
    if (pmjayPackages.length === 0 || allItems.length === 0) return;

    const selectedPkg = pmjayPackages.find(p => p.id === selectedPackageId);
    if (selectedPkg) {
      // load default consumables
      const defaults = selectedPkg.defaultConsumables.map(dc => {
        const item = allItems.find(i => i.id === dc.itemId);
        if (item) {
          return {
            itemId: item.id!,
            name: item.name,
            category: item.category,
            modelSize: item.modelSize,
            batchLotNo: item.batchLotNo,
            quantity: dc.quantity,
            unitCost: item.unitCost,
            currentQuantity: item.currentQuantity
          };
        }
        return null;
      }).filter(Boolean) as SelectedItem[];
      setConsumedList(defaults);
    } else {
      setConsumedList([]);
    }
  }, [selectedPackageId, pmjayPackages, allItems]);

  // Add Item from search results list
  const addSearchItemToList = (item: Item) => {
    if (!item.id) return;
    const exists = consumedList.find(c => c.itemId === item.id);
    if (exists) {
      alert(`${item.name} is already added to this procedure.`);
      return;
    }
    setConsumedList([
      ...consumedList,
      {
        itemId: item.id,
        name: item.name,
        category: item.category,
        modelSize: item.modelSize,
        batchLotNo: item.batchLotNo,
        quantity: 1,
        unitCost: item.unitCost,
        currentQuantity: item.currentQuantity
      }
    ]);
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
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batchLotNo.toLowerCase().includes(searchQuery.toLowerCase())
    ) && item.currentQuantity > 0;
  }).slice(0, 5);

  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Save Custom Item Directly to Catalog
  const handleSaveCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cBatch || cCost <= 0 || cQty <= 0) {
      alert("Please fill in Name, Batch, Unit Cost, and Quantity.");
      return;
    }

    try {
      const newItem: Omit<Item, 'id'> = {
        name: cName,
        category: cCategory as any,
        manufacturer: cManufacturer || 'General Medical',
        modelSize: cSize || 'Standard',
        batchLotNo: cBatch,
        expiryDate: cExpiry,
        unitCost: Number(cCost),
        currentQuantity: Number(cQty),
        reorderLevel: 1,
        storageLocation: cLoc || 'General Rack'
      };

      const newId = await db.items.add(newItem as Item);

      // Log receipt ledger entry for audit trail
      await db.ledger.add({
        itemId: newId,
        itemName: cName,
        category: cCategory,
        timestamp: Date.now(),
        type: 'received',
        quantityChanged: Number(cQty),
        quantityAfter: Number(cQty),
        operator: operator || "System Seeding",
        referenceId: "CUSTOM-ADD",
        reason: "Ad-hoc costly item addition during case logging"
      });

      // Append directly to the active consumedList
      setConsumedList([
        ...consumedList,
        {
          itemId: newId,
          name: cName,
          category: cCategory,
          modelSize: cSize || 'Standard',
          batchLotNo: cBatch,
          quantity: 1,
          unitCost: Number(cCost),
          currentQuantity: Number(cQty)
        }
      ]);

      // Reset states
      setCName('');
      setCManufacturer('');
      setCSize('');
      setCBatch('');
      setCCost(0);
      setCLoc('');
      setCQty(1);
      setIsOpenCustomItemModal(false);
      setSearchQuery('');
      setShowSearchResults(false);
      
      alert(`Custom item "${cName}" added successfully to catalog and linked to this case!`);
    } catch (err) {
      console.error("Failed to add custom item:", err);
      alert("Error adding custom item to database.");
    }
  };

  // Form Submit
  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Core Validations
    if (!caseId || !patientRef || !operator || !technician) {
      alert("Please fill in Case ID, Patient Reference, Consultant name, and Technician name.");
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
          operator, // Consultant Cardiologist
          technician, // Catheterization Technician (Data Entry)
          cathLab,
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

      // Save to local memory
      const consultants = JSON.parse(localStorage.getItem('cathlab_consultants') || '[]');
      if (!consultants.includes(operator)) {
        consultants.push(operator);
        localStorage.setItem('cathlab_consultants', JSON.stringify(consultants));
      }
      const technicians = JSON.parse(localStorage.getItem('cathlab_technicians') || '[]');
      if (!technicians.includes(technician)) {
        technicians.push(technician);
        localStorage.setItem('cathlab_technicians', JSON.stringify(technicians));
      }

      alert("Case consumption logged successfully! Stock quantities have been decremented.");
      onSuccess();
    } catch (err) {
      console.error("Error saving procedure case:", err);
      alert("Failed to save procedure case. Transaction rolled back.");
    }
  };

  return (
    <div className="p-6 space-y-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight m-0">Log Cardiac Intervention (New Case)</h1>
        <p className="text-sm text-slate-500">Record procedure consumable usage and enforce package cost compliance limits</p>
      </div>

      <form onSubmit={handleSaveCase} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Columns: Core Case Details */}
          <div className="lg:col-span-1 space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold text-slate-700 tracking-tight border-b border-slate-100 pb-2 flex items-center gap-1.5 m-0">
              <FilePlus className="w-4 h-4 text-slate-500" />
              Case Identification
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Case ID / IPD No. *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. C-2026-1049"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Procedure Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Procedure Type *</label>
                  <select
                    value={procedureType}
                    onChange={(e) => setProcedureType(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium"
                  >
                    <option value="PCI">PCI (Coronary Stents)</option>
                    <option value="Coronary Angiography">Coronary Angiography</option>
                    <option value="PPI">PPI (Pacemaker)</option>
                    <option value="BMV">BMV (Mitral Balloon)</option>
                    <option value="ASD">ASD (Device Closure)</option>
                    <option value="PDA">PDA (Device Closure)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cath Lab Room *</label>
                  <select
                    value={cathLab}
                    onChange={(e) => setCathLab(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium"
                  >
                    <option value="Cathlab 1">Cathlab 1</option>
                    <option value="Cathlab 2">Cathlab 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Reference (Initials / UHID) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MK / UHID-908711"
                  value={patientRef}
                  onChange={(e) => setPatientRef(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Consultant Cardiologist *</label>
                <input
                  type="text"
                  required
                  list="consultant-names"
                  placeholder="Enter or select doctor name"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold"
                />
                <datalist id="consultant-names">
                  {rememberedConsultants.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catheterization Technician *</label>
                <input
                  type="text"
                  required
                  list="technician-names"
                  placeholder="Enter or select data entry technician"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold"
                />
                <datalist id="technician-names">
                  {rememberedTechnicians.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PMJAY Package Ceiling *</label>
                <select
                  value={selectedPackageId || ''}
                  onChange={(e) => setSelectedPackageId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium"
                >
                  <option value="">General Billing (No Package Cap)</option>
                  {pmjayPackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.code} - {pkg.name} ({formatRupees(pkg.ceilingAmount)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right Columns: Consumables consumption list */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* PMJAY Cost Status Card */}
            {selectedPackage && (
              <div className={`p-4 rounded-xl border shadow-sm space-y-3 ${
                overCeiling ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-250'
              }`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-750 uppercase tracking-wider m-0">
                    PMJAY Package Billing Compliance
                  </h3>
                  {overCeiling ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                      <AlertTriangle className="w-3 h-3" /> BUDGET OVER CEILING
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                      COMPLIANT BUDGET
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-center font-mono py-2 bg-white/70 rounded-lg border border-slate-100">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ceiling Limit</span>
                    <span className="text-sm font-bold text-slate-800">{formatRupees(ceilingAmount)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Cost</span>
                    <span className={`text-sm font-bold ${overCeiling ? 'text-rose-700' : 'text-slate-800'}`}>
                      {formatRupees(totalCost)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Variance</span>
                    <span className={`text-sm font-bold ${overCeiling ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {overCeiling ? `-${formatRupees(Math.abs(variance))}` : `+${formatRupees(variance)}`}
                    </span>
                  </div>
                </div>

                {overCeiling && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-rose-900 uppercase tracking-wider">
                      Clinical Justification Reason for Over-Ceiling *
                    </label>
                    <textarea
                      required
                      placeholder="Please document specific medical justification (e.g. calcified multi-vessel lesions requiring second drug-eluting stent, anatomy variations, tortuous access sheaths etc.) for hospital audit logs."
                      value={overCeilingReason}
                      onChange={(e) => setOverCeilingReason(e.target.value)}
                      className="w-full p-2 border border-rose-200 rounded-lg text-xs font-sans bg-white"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Consumables Selection search & builder */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-700 tracking-tight border-b border-slate-100 pb-2 flex items-center gap-1.5 m-0">
                <Search className="w-4 h-4 text-slate-500" />
                Add Consumed Items
              </h2>

              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by catalog name, manufacturer or batch number..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white"
                  />
                </div>

                {showSearchResults && searchQuery && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-xs">
                        <p className="mb-2">No matching items in catalog with available stock</p>
                        <button
                          type="button"
                          onClick={() => setIsOpenCustomItemModal(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded text-[10px] flex items-center gap-1 mx-auto shadow-2xs"
                        >
                          <Plus className="w-3 h-3" /> Create Custom Costly Item Directly
                        </button>
                      </div>
                    ) : (
                      <>
                        {searchResults.map(item => (
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
                        ))}
                        <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                          <button
                            type="button"
                            onClick={() => setIsOpenCustomItemModal(true)}
                            className="text-blue-650 hover:text-blue-800 font-bold text-[10px] flex items-center gap-1 justify-center mx-auto"
                          >
                            <Plus className="w-3.5 h-3.5" /> Can't find item? Create Custom Costly Item directly
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Consumables Table */}
              <div className="border border-slate-150 rounded-lg overflow-hidden">
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
                            <td className="py-2 px-3 text-right font-mono text-slate-900 font-bold">
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
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Consumables Cost</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{formatRupees(totalCost)}</span>
                </div>
              )}

              {/* Form submission controls */}
              <div className="flex justify-end gap-3 pt-2">
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
        </div>
      </form>

      {/* ========================================================================= */}
      {/* MODAL: AD-HOC CUSTOM COSTLY ITEM CREATOR */}
      {/* ========================================================================= */}
      {isOpenCustomItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-100">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 text-left">
              <div>
                <h2 className="text-base font-bold text-slate-800 m-0">Add Custom Costly Item to Catalog</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Quickly inject high-cost or unlisted materials directly into active stock</p>
              </div>
              <button 
                onClick={() => setIsOpenCustomItemModal(false)}
                className="text-slate-400 hover:text-slate-600 border border-slate-200 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomItem} className="p-5 space-y-4 text-left text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Item Name / Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Custom Aortic Occlusion Balloon"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={cCategory}
                    onChange={(e) => setCCategory(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="stent">Stent</option>
                    <option value="balloon">Balloon</option>
                    <option value="pacemaker">Pacemaker</option>
                    <option value="closure device">Closure Device</option>
                    <option value="guidewire">Guidewire</option>
                    <option value="catheter">Catheter</option>
                    <option value="sheath">Sheath</option>
                    <option value="consumable">Consumable</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abbott, Medtronic"
                    value={cManufacturer}
                    onChange={(e) => setCManufacturer(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Model / Dimensions *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24mm, 6F x 11cm"
                    value={cSize}
                    onChange={(e) => setCSize(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch / Lot Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LOT-998811"
                    value={cBatch}
                    onChange={(e) => setCBatch(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={cExpiry}
                    onChange={(e) => setCExpiry(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Cost (INR) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Enter cost in Rupees"
                    value={cCost || ''}
                    onChange={(e) => setCCost(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Storage Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cabinet C-4"
                    value={cLoc}
                    onChange={(e) => setCLoc(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Immediate Quantity to Add *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={cQty}
                    onChange={(e) => setCQty(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenCustomItemModal(false)}
                  className="px-4 py-2 border border-slate-250 text-slate-700 font-bold rounded-lg hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-500/10"
                >
                  <Save className="w-3.5 h-3.5" /> Save to Catalog & Add
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
