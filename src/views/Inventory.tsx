import React, { useState } from 'react';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { db, type Item, type LedgerEntry } from '../db/db';
import { 
  Search, 
  Plus, 
  History, 
  RotateCcw,
  X
} from 'lucide-react';

export const Inventory: React.FC = () => {
  // Queries
  const { data: items = [] } = useSupabaseTable<Item>('items');
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, low
  const [expiryFilter, setExpiryFilter] = useState('all'); // all, expired, 30, 60, 90

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<Item | null>(null);
  
  // History Drawer
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<Item | null>(null);
  const [itemLedger, setItemLedger] = useState<LedgerEntry[]>([]);

  // Form states: Add Item
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'stent' as Item['category'],
    manufacturer: '',
    modelSize: '',
    batchLotNo: '',
    expiryDate: '',
    unitCost: 0,
    currentQuantity: 0,
    reorderLevel: 1,
    storageLocation: '',
    operator: '' // required for audit
  });

  // Form states: Adjust Stock
  const [adjustData, setAdjustData] = useState({
    newQuantity: 0,
    operator: '',
    type: 'adjusted' as LedgerEntry['type'],
    reason: ''
  });

  // Categories list
  const categories: Item['category'][] = [
    'guidewire', 'balloon', 'stent', 'catheter', 'sheath', 
    'pacemaker', 'closure device', 'consumable', 'other'
  ];

  // Expiry check helper
  const getExpiryBadge = (dateStr: string) => {
    const now = Date.now();
    const exp = new Date(dateStr).getTime();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: 'Expired', style: 'bg-red-100 text-red-800 border-red-200' };
    } else if (diffDays <= 30) {
      return { label: `Expiring: ${diffDays}d`, style: 'bg-red-50 text-red-600 border-red-100 font-semibold' };
    } else if (diffDays <= 60) {
      return { label: `Expiring: ${diffDays}d`, style: 'bg-amber-100 text-amber-800 border-amber-250' };
    } else if (diffDays <= 90) {
      return { label: `Expiring: ${diffDays}d`, style: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    }
    return { label: `Exp: ${dateStr}`, style: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  // Filter logic
  const filteredItems = items.filter(item => {
    // Search filter
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batchLotNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.modelSize.toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;

    // Stock level filter
    const matchesStock = stockFilter === 'all' || (stockFilter === 'low' && item.currentQuantity <= item.reorderLevel);

    // Expiry filter
    let matchesExpiry = true;
    const now = Date.now();
    const exp = new Date(item.expiryDate).getTime();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (expiryFilter === 'expired') {
      matchesExpiry = diffDays < 0;
    } else if (expiryFilter === '30') {
      matchesExpiry = diffDays >= 0 && diffDays <= 30;
    } else if (expiryFilter === '60') {
      matchesExpiry = diffDays >= 0 && diffDays <= 60;
    } else if (expiryFilter === '90') {
      matchesExpiry = diffDays >= 0 && diffDays <= 90;
    }

    return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
  });

  // Handle Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.batchLotNo || !newItem.expiryDate) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      await db.transaction('rw', [db.items, db.ledger], async () => {
        const addedItem: Item = {
          name: newItem.name,
          category: newItem.category,
          manufacturer: newItem.manufacturer,
          modelSize: newItem.modelSize,
          batchLotNo: newItem.batchLotNo,
          expiryDate: newItem.expiryDate,
          unitCost: Number(newItem.unitCost),
          currentQuantity: Number(newItem.currentQuantity),
          reorderLevel: Number(newItem.reorderLevel),
          storageLocation: newItem.storageLocation
        };

        const id = await db.items.add(addedItem);

        // Record Initial Ledger entry
        const ledger: LedgerEntry = {
          itemId: id,
          itemName: addedItem.name,
          category: addedItem.category,
          timestamp: Date.now(),
          type: 'received',
          quantityChanged: addedItem.currentQuantity,
          quantityAfter: addedItem.currentQuantity,
          operator: 'Cath Lab Store In-charge',
          referenceId: 'INITIAL-STOCK',
          reason: 'Initial item catalog addition'
        };

        await db.ledger.add(ledger);
      });

      // Reset & Close
      setNewItem({
        name: '',
        category: 'stent',
        manufacturer: '',
        modelSize: '',
        batchLotNo: '',
        expiryDate: '',
        unitCost: 0,
        currentQuantity: 0,
        reorderLevel: 1,
        storageLocation: '',
        operator: ''
      });
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Error adding item:", err);
      alert("Failed to add inventory item.");
    }
  };

  // Open adjustment modal
  const openAdjustModal = (item: Item) => {
    setSelectedItemForAdjust(item);
    setAdjustData({
      newQuantity: item.currentQuantity,
      operator: '',
      type: 'adjusted',
      reason: ''
    });
    setIsAdjustModalOpen(true);
  };

  // Handle Adjust Stock
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust || !selectedItemForAdjust.id) return;
    if (!adjustData.operator || !adjustData.reason) {
      alert("Please fill in all fields (operator name and justification reason are required).");
      return;
    }

    try {
      await db.transaction('rw', [db.items, db.ledger], async () => {
        const item = await db.items.get(selectedItemForAdjust.id!);
        if (!item) throw new Error("Item not found");

        const qtyDiff = adjustData.newQuantity - item.currentQuantity;
        if (qtyDiff === 0) {
          alert("New quantity is identical to current quantity. No adjustment logged.");
          return;
        }

        // Update item stock
        item.currentQuantity = adjustData.newQuantity;
        await db.items.put(item);

        // Record Ledger
        const ledger: LedgerEntry = {
          itemId: item.id!,
          itemName: item.name,
          category: item.category,
          timestamp: Date.now(),
          type: adjustData.type,
          quantityChanged: qtyDiff,
          quantityAfter: item.currentQuantity,
          operator: adjustData.operator,
          referenceId: 'MANUAL-ADJUST',
          reason: adjustData.reason
        };

        await db.ledger.add(ledger);
      });

      setIsAdjustModalOpen(false);
      setSelectedItemForAdjust(null);
    } catch (err) {
      console.error("Error adjusting stock:", err);
      alert("Failed to adjust stock quantity.");
    }
  };

  // View Ledger History Drawer
  const openHistoryDrawer = async (item: Item) => {
    if (!item.id) return;
    setSelectedItemForHistory(item);
    try {
      const entries = await db.ledger
        .where('itemId')
        .equals(item.id)
        .reverse()
        .sortBy('timestamp');
      setItemLedger(entries);
      setIsHistoryOpen(true);
    } catch (err) {
      console.error("Error fetching ledger entries:", err);
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
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight m-0">Inventory Master & Stock Ledger</h1>
          <p className="text-sm text-slate-500">Track batch expiry, storage locations, and audit trails</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" /> Add Catalog Item
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 no-print">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, size, batch, or manufacturer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          {/* Reset Filters */}
          {(searchTerm || categoryFilter || stockFilter !== 'all' || expiryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('');
                setStockFilter('all');
                setExpiryFilter('all');
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Stock Level</label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="all">All Levels</option>
              <option value="low">Low Stock (≤ Reorder)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Expiry Status</label>
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="all">All Expiries</option>
              <option value="expired">Expired</option>
              <option value="30">Expiring in 30 Days</option>
              <option value="60">Expiring in 60 Days</option>
              <option value="90">Expiring in 90 Days</option>
            </select>
          </div>

          <div className="flex items-end justify-end text-xs text-slate-400 font-medium">
            Showing {filteredItems.length} of {items.length} items
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50 uppercase tracking-wider">
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4">Size/Model</th>
                <th className="py-3 px-4">Batch/Lot No</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
                    No items match the chosen filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.currentQuantity <= item.reorderLevel;
                  const expiryBadge = getExpiryBadge(item.expiryDate);
                  
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/50 ${isLow ? 'bg-amber-50/15' : ''}`}>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-450 mt-0.5">Loc: {item.storageLocation || 'N/A'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{item.manufacturer}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">{item.modelSize}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">{item.batchLotNo}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${expiryBadge.style}`}>
                          {expiryBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`font-mono text-sm font-bold ${
                            isLow ? 'text-red-650' : 'text-slate-800'
                          }`}>
                            {item.currentQuantity}
                          </span>
                          {isLow && (
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                              Low (reorder: {item.reorderLevel})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-905 font-bold">
                        {formatRupees(item.unitCost)}
                      </td>
                      <td className="py-3.5 px-4 text-center space-x-1.5 no-print">
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                        >
                          Adjust Qty
                        </button>
                        <button
                          onClick={() => openHistoryDrawer(item)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded hover:bg-slate-250 hover:text-slate-900 transition-colors flex inline-flex items-center gap-1"
                        >
                          <History className="w-3 h-3" /> Audit Log
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-100">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 m-0">Add New Catalog Item</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-5 space-y-4 text-left">
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. XIENCE Sierra Everolimus-Eluting Stent"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as Item['category'] })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abbott"
                    value={newItem.manufacturer}
                    onChange={(e) => setNewItem({ ...newItem, manufacturer: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Model Size / Dimensions</label>
                  <input
                    type="text"
                    placeholder="e.g. 3.00mm x 18mm"
                    value={newItem.modelSize}
                    onChange={(e) => setNewItem({ ...newItem, modelSize: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Batch / Lot No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-12938"
                    value={newItem.batchLotNo}
                    onChange={(e) => setNewItem({ ...newItem, batchLotNo: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newItem.expiryDate}
                    onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Cost (INR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItem.unitCost || ''}
                    onChange={(e) => setNewItem({ ...newItem, unitCost: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItem.currentQuantity || ''}
                    onChange={(e) => setNewItem({ ...newItem, currentQuantity: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reorder Level *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItem.reorderLevel || ''}
                    onChange={(e) => setNewItem({ ...newItem, reorderLevel: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Storage Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cabinet A, Shelf 2"
                    value={newItem.storageLocation}
                    onChange={(e) => setNewItem({ ...newItem, storageLocation: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-3 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-xl flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm shadow-blue-500/10"
                >
                  Save Item
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Quantity */}
      {isAdjustModalOpen && selectedItemForAdjust && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 m-0">Adjust Stock Quantity</h2>
              <button onClick={() => { setIsAdjustModalOpen(false); setSelectedItemForAdjust(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-5 space-y-4 text-left">
              {/* Product Info Block */}
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1">
                <div className="text-xs font-bold text-slate-800">{selectedItemForAdjust.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Batch: {selectedItemForAdjust.batchLotNo} | Size: {selectedItemForAdjust.modelSize}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  Current Stock: <span className="font-bold text-slate-900">{selectedItemForAdjust.currentQuantity}</span>
                </div>
              </div>

              {/* Adjust Qty Form */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Stock Quantity *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustData.newQuantity}
                  onChange={(e) => setAdjustData({ ...adjustData, newQuantity: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Adjustment Type *</label>
                <select
                  value={adjustData.type}
                  onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value as LedgerEntry['type'] })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="adjusted">Adjusted (Discrepancy/Damage/Loss)</option>
                  <option value="received">Received (New stock delivery)</option>
                  <option value="expired">Expired (Marked as expired & discarded)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Audit Reason / Justification *</label>
                <textarea
                  required
                  placeholder="Explain why this change is being made (e.g. 'Physical inventory count reconciliation' or 'Item packaging damaged in ward')"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  rows={3}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operator Name (Audit Mandate) *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name / initials"
                  value={adjustData.operator}
                  onChange={(e) => setAdjustData({ ...adjustData, operator: e.target.value })}
                  className="w-full p-2 border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAdjustModalOpen(false); setSelectedItemForAdjust(null); }}
                  className="px-4 py-2 border border-slate-250 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm text-xs"
                >
                  Save Stock Ledger Adjust
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slider Drawer: Ledger Audit Log History */}
      {isHistoryOpen && selectedItemForHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-100">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-800 m-0">Ledger Audit History</h2>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Item ID: #{selectedItemForHistory.id}</p>
              </div>
              <button 
                onClick={() => { setIsHistoryOpen(false); setSelectedItemForHistory(null); setItemLedger([]); }} 
                className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-md border border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item Details card in drawer */}
            <div className="p-4 bg-blue-50/50 border-b border-slate-100 space-y-1 text-left text-xs">
              <div className="font-bold text-slate-900">{selectedItemForHistory.name}</div>
              <div className="grid grid-cols-2 gap-y-1 text-slate-600 mt-1">
                <div>Manufacturer: <span className="font-semibold text-slate-850">{selectedItemForHistory.manufacturer}</span></div>
                <div>Size/Model: <span className="font-semibold text-slate-850">{selectedItemForHistory.modelSize}</span></div>
                <div>Category: <span className="font-semibold text-slate-850 uppercase">{selectedItemForHistory.category}</span></div>
                <div>Batch/Lot No: <span className="font-semibold text-slate-850 font-mono">{selectedItemForHistory.batchLotNo}</span></div>
              </div>
            </div>

            {/* Log List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {itemLedger.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No audit logs found for this item.
                </div>
              ) : (
                itemLedger.map((log) => {
                  let badgeStyle = 'bg-slate-100 text-slate-700';
                  if (log.type === 'received') badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-150';
                  if (log.type === 'consumed') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-150';
                  if (log.type === 'expired') badgeStyle = 'bg-red-50 text-red-700 border-red-150';
                  if (log.type === 'adjusted') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-150';

                  return (
                    <div key={log.id} className="p-3 bg-white border border-slate-150 rounded-lg space-y-2 text-xs text-left shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase border ${badgeStyle}`}>
                          {log.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      {/* Qty Shift */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-y border-slate-50 py-1">
                        <div>Change: <span className={`font-bold ${log.quantityChanged > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                        </span></div>
                        <div className="text-right">Balance After: <span className="font-bold text-slate-900">{log.quantityAfter}</span></div>
                      </div>

                      {/* Log meta */}
                      <div className="space-y-1 text-slate-500 text-[10px]">
                        <div>
                          Operator: <span className="font-bold text-slate-700">{log.operator}</span>
                        </div>
                        {log.referenceId && (
                          <div>
                            Reference: <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">{log.referenceId}</span>
                          </div>
                        )}
                        {log.reason && (
                          <div className="bg-slate-50 p-2 rounded text-slate-650 italic mt-1 border border-slate-100">
                            " {log.reason} "
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => { setIsHistoryOpen(false); setSelectedItemForHistory(null); setItemLedger([]); }} 
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg text-xs"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
