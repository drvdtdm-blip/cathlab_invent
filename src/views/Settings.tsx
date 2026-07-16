import React, { useState } from 'react';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { db, type PmjayPackage, type Item } from '../db/db';
import { resetDatabase } from '../db/seed';
import { 
  Settings as SettingsIcon, 
  Database, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Search
} from 'lucide-react';

interface SettingsProps {
  onResetSuccess: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onResetSuccess }) => {
  // Queries
  const { data: pmjayPackages = [] } = useSupabaseTable<PmjayPackage>('pmjay_packages');
  const { data: allItems = [] } = useSupabaseTable<Item>('items');

  // Editing state
  const [editingPkg, setEditingPkg] = useState<PmjayPackage | null>(null);

  // Search items state inside editor
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Reset database handler
  const handleResetDb = async () => {
    const confirmReset = window.confirm(
      "WARNING: This will delete ALL logged cases, requisitions, manually added inventory items, and custom package modifications. It will restore the default seed data. Do you want to proceed?"
    );
    if (!confirmReset) return;

    try {
      await resetDatabase();
      alert("Database reset successfully! Mock inventory items and PMJAY packages have been loaded.");
      onResetSuccess();
    } catch (err) {
      console.error("Error resetting database:", err);
      alert("Failed to reset database.");
    }
  };

  // Open package editor
  const startEditingPkg = (pkg: PmjayPackage) => {
    // Deep clone to avoid mutating the live indexedDB object before saving
    setEditingPkg(JSON.parse(JSON.stringify(pkg)));
  };

  // Update quantity in package template
  const updatePkgItemQty = (itemId: number, qty: number) => {
    if (!editingPkg) return;
    const updated = editingPkg.defaultConsumables.map(item => 
      item.itemId === itemId ? { ...item, quantity: Math.max(1, qty) } : item
    );
    setEditingPkg({ ...editingPkg, defaultConsumables: updated });
  };

  // Remove item from package template
  const removePkgItem = (itemId: number) => {
    if (!editingPkg) return;
    const updated = editingPkg.defaultConsumables.filter(item => item.itemId !== itemId);
    setEditingPkg({ ...editingPkg, defaultConsumables: updated });
  };

  // Add catalog item to package template
  const addPkgItem = (item: Item) => {
    if (!editingPkg) return;
    if (!item.id) return;

    const exists = editingPkg.defaultConsumables.find(i => i.itemId === item.id);
    if (exists) {
      alert(`${item.name} is already in this template.`);
      return;
    }

    const updated = [
      ...editingPkg.defaultConsumables,
      { itemId: item.id, quantity: 1 }
    ];

    setEditingPkg({ ...editingPkg, defaultConsumables: updated });
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Save package modifications
  const handleSavePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg || !editingPkg.id) return;
    if (!editingPkg.name || !editingPkg.ceilingAmount) {
      alert("Please fill in package name and ceiling amount.");
      return;
    }

    try {
      await db.pmjayPackages.put(editingPkg);
      alert(`Package "${editingPkg.code}" template saved successfully.`);
      setEditingPkg(null);
    } catch (err) {
      console.error("Error saving package template:", err);
      alert("Failed to save package template.");
    }
  };

  // Resolve item name from catalog (Dexie)
  const getItemName = (id: number) => {
    const item = allItems.find(i => i.id === id);
    return item ? `${item.name} (${item.modelSize})` : `Unknown Item (ID: ${id})`;
  };

  // Format currency
  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Search items list filtering
  const itemSearchResults = allItems.filter(item => {
    if (!searchQuery) return false;
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.modelSize.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }).slice(0, 5);

  return (
    <div className="p-6 space-y-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight m-0">Settings & System Master</h1>
        <p className="text-sm text-slate-500">Configure default procedure consumption templates and reset database assets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: PMJAY Package Templates */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 tracking-tight border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <SettingsIcon className="w-4 h-4 text-slate-500" />
              PMJAY Procedure Packages & Default Templates
            </h2>
            
            <div className="space-y-3">
              {pmjayPackages.map(pkg => (
                <div key={pkg.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">
                        {pkg.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-850 m-0">{pkg.name}</h4>
                    </div>
                    <p className="text-xs text-slate-600">
                      Ceiling Limit: <span className="font-semibold text-slate-800">{pkg.ceilingAmount === 0 ? 'Stratification Required / Custom Quote' : formatRupees(pkg.ceilingAmount)}</span>
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      Template Items: {pkg.defaultConsumables.length} item types preloaded
                    </p>
                  </div>
                  
                  <button
                    onClick={() => startEditingPkg(pkg)}
                    className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-250 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Database Maintenance */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white p-5 rounded-xl border border-slate-205 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-750 tracking-tight border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-500" />
              System Maintenance
            </h2>

            <div className="p-4 bg-red-50/30 border border-red-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-red-650" />
                Reset Master Data
              </h3>
              <p className="text-xs text-slate-650 leading-relaxed">
                Clicking the button below will clear all user-defined database entries, procedures, requisitions, and audit histories, resetting the system to the initial preloaded mock dataset (19 default items, 5 standard package templates, and starting stock logs).
              </p>
              
              <button
                onClick={handleResetDb}
                className="w-full bg-red-650 hover:bg-red-750 text-white font-bold py-2 rounded-lg text-xs shadow-xs transition-colors"
              >
                Reset Database to Seed Data
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Edit PMJAY Package Template */}
      {editingPkg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-100">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 m-0">Edit Package & Template</h2>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Package ID: #{editingPkg.id} ({editingPkg.code})</p>
              </div>
              <button onClick={() => setEditingPkg(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePkg} className="p-5 space-y-4">
              
              {/* Package Header Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Package Name</label>
                  <input
                    type="text"
                    required
                    value={editingPkg.name}
                    onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ceiling Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingPkg.ceilingAmount}
                    onChange={(e) => setEditingPkg({ ...editingPkg, ceilingAmount: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Template Items List */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Expected Consumables Template
                </h3>

                {/* Add Item searcher / selector */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search and append catalog item to this template..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchResults(true);
                        }}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white"
                      />
                    </div>

                    {showSearchResults && searchQuery && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {itemSearchResults.length === 0 ? (
                          <div className="p-2 text-center text-slate-450">No matching items</div>
                        ) : (
                          itemSearchResults.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => addPkgItem(item)}
                              className="w-full text-left p-2 hover:bg-slate-50 flex justify-between items-center transition-colors font-sans"
                            >
                              <div>
                                <div className="font-bold">{item.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">Size: {item.modelSize}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const item = allItems.find(i => i.id === Number(val));
                        if (item) addPkgItem(item);
                        e.target.value = ""; // reset
                      }
                    }}
                    className="border border-slate-200 rounded-lg text-xs px-2.5 py-2 bg-slate-50 hover:bg-white cursor-pointer w-full sm:w-48 font-sans"
                  >
                    <option value="">-- Quick Add Catalog Item --</option>
                    {allItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.modelSize})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Items Table inside Editor */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto font-sans text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50 uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3 text-center w-24">Default Qty</th>
                        <th className="py-2 px-3 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {editingPkg.defaultConsumables.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-6 text-slate-400">
                            No items pre-seeded in this template. Search and add.
                          </td>
                        </tr>
                      ) : (
                        editingPkg.defaultConsumables.map(item => (
                          <tr key={item.itemId}>
                            <td className="py-2 px-3">{getItemName(item.itemId)}</td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                required
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updatePkgItemQty(item.itemId, Number(e.target.value))}
                                className="w-16 p-1 border border-slate-200 rounded text-center font-mono font-bold"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removePkgItem(item.itemId)}
                                className="text-red-500 hover:text-red-700 p-1 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPkg(null)}
                  className="px-4 py-2 border border-slate-250 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save Template
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
