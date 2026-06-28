import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Requisition, type Item, type LedgerEntry } from '../db/db';
import { 
  Plus, 
  Send, 
  CheckSquare, 
  Printer, 
  X, 
  Trash2, 
  Search, 
  ArrowLeft,
  ClipboardList
} from 'lucide-react';

export const Requisitions: React.FC = () => {
  // Queries
  const requisitions = useLiveQuery(() => db.requisitions.toArray(), []) || [];
  const allItems = useLiveQuery(() => db.items.toArray(), []) || [];

  // Navigation states
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Manual search items
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Receiving Modal state
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingOperator, setReceivingOperator] = useState('');

  // Generate Unique Requisition Number
  const generateReqNumber = () => {
    const today = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `R-${today}-${rand}`;
  };

  // 1. Generate Auto-Requisition (For Low-Stock Items)
  const handleGenerateAutoReq = async () => {
    const lowStockItems = allItems.filter(i => i.currentQuantity <= i.reorderLevel);
    
    if (lowStockItems.length === 0) {
      alert("No items are currently at or below their reorder levels. All stocks are sufficient!");
      return;
    }

    const itemsList = lowStockItems.map(item => {
      // Suggested Order = (Reorder Level * 2) - Current Stock
      // Ensure it is at least 1
      const suggestedQty = Math.max(1, (item.reorderLevel * 2) - item.currentQuantity);
      return {
        itemId: item.id!,
        name: item.name,
        category: item.category,
        manufacturer: item.manufacturer,
        modelSize: item.modelSize,
        currentQuantity: item.currentQuantity,
        reorderLevel: item.reorderLevel,
        orderQuantity: suggestedQty
      };
    });

    const newReq: Requisition = {
      requisitionNo: generateReqNumber(),
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      type: 'auto',
      operator: '',
      items: itemsList
    };

    try {
      const id = await db.requisitions.add(newReq);
      const saved = await db.requisitions.get(id);
      if (saved) {
        setSelectedReq(saved);
        setIsEditing(true);
      }
    } catch (err) {
      console.error("Error creating auto requisition:", err);
    }
  };

  // 2. Create Empty Manual Requisition
  const handleCreateManualReq = async () => {
    const newReq: Requisition = {
      requisitionNo: generateReqNumber(),
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      type: 'manual',
      operator: '',
      items: []
    };

    try {
      const id = await db.requisitions.add(newReq);
      const saved = await db.requisitions.get(id);
      if (saved) {
        setSelectedReq(saved);
        setIsEditing(true);
      }
    } catch (err) {
      console.error("Error creating manual requisition:", err);
    }
  };

  // Add Item to Requisition in Editor
  const addItemToReq = (item: Item) => {
    if (!selectedReq) return;
    if (!item.id) return;

    // Check if already in req items list
    const exists = selectedReq.items.find(i => i.itemId === item.id);
    if (exists) {
      alert(`${item.name} is already in the requisition list.`);
      return;
    }

    const updatedItems = [
      ...selectedReq.items,
      {
        itemId: item.id,
        name: item.name,
        category: item.category,
        manufacturer: item.manufacturer,
        modelSize: item.modelSize,
        currentQuantity: item.currentQuantity,
        reorderLevel: item.reorderLevel,
        orderQuantity: 5 // default order quantity
      }
    ];

    setSelectedReq({ ...selectedReq, items: updatedItems });
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Update order quantity
  const updateOrderQty = (itemId: number, qty: number) => {
    if (!selectedReq) return;
    const updated = selectedReq.items.map(item => 
      item.itemId === itemId ? { ...item, orderQuantity: qty } : item
    );
    setSelectedReq({ ...selectedReq, items: updated });
  };

  // Remove item from requisition
  const removeItemFromReq = (itemId: number) => {
    if (!selectedReq) return;
    const updated = selectedReq.items.filter(item => item.itemId !== itemId);
    setSelectedReq({ ...selectedReq, items: updated });
  };

  // Save requisition draft
  const handleSaveDraft = async () => {
    if (!selectedReq || !selectedReq.id) return;
    try {
      await db.requisitions.put(selectedReq);
      alert("Requisition draft saved successfully.");
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving draft:", err);
      alert("Failed to save draft.");
    }
  };

  // Submit Requisition (Lock it, ready for print/submitting)
  const handleSubmitReq = async () => {
    if (!selectedReq || !selectedReq.id) return;
    if (!selectedReq.operator.trim()) {
      alert("Please enter the Operator name before submitting.");
      return;
    }
    if (selectedReq.items.length === 0) {
      alert("Cannot submit an empty requisition. Please add items.");
      return;
    }

    const confirmSubmit = window.confirm("Are you sure you want to SUBMIT this requisition? This will lock the items list.");
    if (!confirmSubmit) return;

    try {
      const updatedReq: Requisition = {
        ...selectedReq,
        status: 'submitted'
      };
      await db.requisitions.put(updatedReq);
      setSelectedReq(updatedReq);
      setIsEditing(false);
      alert("Requisition submitted successfully! You can now print the letterhead report.");
    } catch (err) {
      console.error("Error submitting requisition:", err);
    }
  };

  // Delete draft requisition completely
  const handleDeleteDraft = async (reqId: number) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this draft requisition?");
    if (!confirmDelete) return;

    try {
      await db.requisitions.delete(reqId);
      setSelectedReq(null);
      setIsEditing(false);
    } catch (err) {
      console.error("Error deleting requisition:", err);
    }
  };

  // Receive stock from vendor (Confirm Receipt)
  const handleConfirmReceipt = async () => {
    if (!selectedReq || !selectedReq.id) return;
    if (!receivingOperator.trim()) {
      alert("Receiving operator name is required.");
      return;
    }

    try {
      await db.transaction('rw', [db.items, db.ledger, db.requisitions], async () => {
        // 1. Loop through items in requisition and add stock
        for (const reqItem of selectedReq.items) {
          const item = await db.items.get(reqItem.itemId);
          if (item) {
            // Update stock
            item.currentQuantity += reqItem.orderQuantity;
            await db.items.put(item);

            // Log received ledger
            const ledger: LedgerEntry = {
              itemId: reqItem.itemId,
              itemName: reqItem.name,
              category: reqItem.category,
              timestamp: Date.now(),
              type: 'received',
              quantityChanged: reqItem.orderQuantity,
              quantityAfter: item.currentQuantity,
              operator: receivingOperator,
              referenceId: selectedReq.requisitionNo,
              reason: "Stock replenishment received against requisition"
            };
            await db.ledger.add(ledger);
          }
        }

        // 2. Update requisition status
        const receivedReq: Requisition = {
          ...selectedReq,
          status: 'received'
        };
        await db.requisitions.put(receivedReq);
        setSelectedReq(receivedReq);
      });

      setIsReceiveModalOpen(false);
      setReceivingOperator('');
      alert("Stock successfully received! Inventory stock levels updated and ledger entries logged.");
    } catch (err) {
      console.error("Error receiving stock:", err);
      alert("Transaction failed while receiving stock.");
    }
  };

  // Filtered requisitions list
  const filteredReqs = requisitions.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.id || 0) - (a.id || 0));

  // Search filter for adding items in editor
  const itemSearchResults = allItems.filter(item => {
    if (!searchQuery) return false;
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.modelSize.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }).slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      
      {/* 1. Main View (Requisitions List) - Hidden during print */}
      {!selectedReq && (
        <div className="space-y-6 no-print text-left">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight m-0">Stock Requisitions</h1>
              <p className="text-sm text-slate-500">Replenish medical consumables and print supply requests</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleGenerateAutoReq}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm text-sm"
              >
                <ClipboardList className="w-4 h-4" /> Auto-Generate (Low Stock)
              </button>
              <button
                onClick={handleCreateManualReq}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm text-sm"
              >
                <Plus className="w-4 h-4" /> Create Manual
              </button>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filter tab */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex gap-2">
                {['all', 'draft', 'submitted', 'received'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      statusFilter === status 
                        ? 'bg-slate-850 text-white shadow-xs' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="text-xs font-semibold text-slate-400 font-mono">
                Total Requisitions: {filteredReqs.length}
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredReqs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No requisitions found. Click "Auto-Generate" or "Create Manual" to start.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50 uppercase tracking-wider">
                      <th className="py-3 px-4">Req Number</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Draft Operator</th>
                      <th className="py-3 px-4 text-center">Items Count</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredReqs.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/30">
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono">{req.requisitionNo}</td>
                        <td className="py-3 px-4 text-slate-600">{req.date}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            req.type === 'auto' ? 'bg-indigo-50 text-indigo-750' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {req.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-650">{req.operator || '—'}</td>
                        <td className="py-3 px-4 text-center text-slate-900 font-bold">{req.items.length}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            req.status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            req.status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setIsEditing(req.status === 'draft');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-750 border border-slate-205 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                          >
                            Open Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Requisition Detail Panel / Letterhead print view */}
      {selectedReq && (
        <div className="space-y-6 text-left">
          {/* Back button and quick actions panel - Hidden during print */}
          <div className="flex justify-between items-center no-print bg-slate-100 p-4 rounded-xl border border-slate-200">
            <button
              onClick={() => { setSelectedReq(null); setIsEditing(false); }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Requisitions list
            </button>

            <div className="flex gap-2">
              {/* Draft actions */}
              {isEditing && selectedReq.status === 'draft' && (
                <>
                  <button
                    onClick={() => handleDeleteDraft(selectedReq.id!)}
                    className="flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 font-bold px-3.5 py-2 rounded-lg text-xs hover:bg-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Draft
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="bg-slate-800 text-white font-bold px-3.5 py-2 rounded-lg text-xs hover:bg-slate-900"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={handleSubmitReq}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> Lock & Submit
                  </button>
                </>
              )}

              {/* Submitted actions */}
              {selectedReq.status === 'submitted' && (
                <>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Letterhead PDF
                  </button>
                  <button
                    onClick={() => setIsReceiveModalOpen(true)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Confirm Receipt (Add to Stock)
                  </button>
                </>
              )}

              {/* Received actions */}
              {selectedReq.status === 'received' && (
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-slate-950"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Copy
                </button>
              )}
            </div>
          </div>

          {/* Letterhead Container */}
          <div className="bg-white p-8 md:p-12 rounded-xl border border-slate-200 shadow-sm print-only-container text-slate-900 space-y-8 font-serif leading-relaxed">
            
            {/* 1. Official Letterhead Header Section */}
            <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-5">
              <h2 className="text-lg font-bold tracking-wide uppercase text-slate-900 font-serif">
                DEPARTMENT OF CARDIOLOGY
              </h2>
              <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-800 font-serif">
                SHYAM SHAH MEDICAL COLLEGE & ASSOCIATED HOSPITALS, REWA
              </h3>
              <p className="text-xs text-slate-650 italic font-sans">
                Cardiac Catheterization Laboratory Stock Requisition Sheet
              </p>
              <p className="text-[10px] text-slate-400 font-sans tracking-wide">
                SSMC Cardiology Wing, Cath Lab Block, Rewa (M.P.)
              </p>
            </div>

            {/* Requisition Metadata Details */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-200 pb-5">
              <div className="space-y-1.5">
                <div>Requisition ID: <span className="font-mono font-bold">{selectedReq.requisitionNo}</span></div>
                <div>Status: <span className="uppercase font-bold text-slate-800">{selectedReq.status}</span></div>
                <div>Billing Type: <span className="uppercase font-bold text-slate-700">{selectedReq.type}</span></div>
              </div>
              <div className="space-y-1.5 text-right">
                <div>Date Generated: <span className="font-semibold">{selectedReq.date}</span></div>
                {selectedReq.operator && (
                  <div>Drafting Operator: <span className="font-semibold">{selectedReq.operator}</span></div>
                )}
              </div>
            </div>

            {/* Editable drafting controls - Hidden during print */}
            {isEditing && selectedReq.status === 'draft' && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 no-print font-sans">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Draft Editor Controls
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Drafting Operator Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Scrub Nurse / Lab Staff initials"
                      value={selectedReq.operator}
                      onChange={(e) => setSelectedReq({ ...selectedReq, operator: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white"
                    />
                  </div>
                  
                  {/* Search and Add items to requisition */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Search & Add Item to List</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search items to append..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchResults(true);
                        }}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                    {showSearchResults && searchQuery && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-25 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {itemSearchResults.length === 0 ? (
                          <div className="p-2 text-center text-slate-400">No matching items</div>
                        ) : (
                          itemSearchResults.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => addItemToReq(item)}
                              className="w-full text-left p-2.5 hover:bg-slate-50 flex justify-between items-center transition-colors"
                            >
                              <div>
                                <div className="font-bold">{item.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">Size: {item.modelSize} | Stock: {item.currentQuantity}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Requisition Items Table */}
            <div className="font-sans text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-2">Item Description</th>
                    <th className="py-2.5 px-2">Manufacturer</th>
                    <th className="py-2.5 px-2">Model/Size</th>
                    <th className="py-2.5 px-2 text-center">Current Stock</th>
                    <th className="py-2.5 px-2 text-center w-24">Order Qty</th>
                    {isEditing && selectedReq.status === 'draft' && <th className="py-2.5 px-2 text-center no-print"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {selectedReq.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No items added to this requisition yet.
                      </td>
                    </tr>
                  ) : (
                    selectedReq.items.map((item, idx) => (
                      <tr key={item.itemId}>
                        <td className="py-3 px-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-2">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[9px] text-slate-400 uppercase font-semibold">{item.category}</div>
                        </td>
                        <td className="py-3 px-2 text-slate-700">{item.manufacturer}</td>
                        <td className="py-3 px-2 text-slate-650 font-mono">{item.modelSize}</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-600">{item.currentQuantity}</td>
                        <td className="py-3 px-2 text-center">
                          {isEditing && selectedReq.status === 'draft' ? (
                            <input
                              type="number"
                              required
                              min="1"
                              value={item.orderQuantity}
                              onChange={(e) => updateOrderQty(item.itemId, Number(e.target.value))}
                              className="w-16 p-1 border border-slate-200 rounded text-center font-mono font-bold bg-white"
                            />
                          ) : (
                            <span className="font-mono font-bold text-sm text-slate-900">{item.orderQuantity}</span>
                          )}
                        </td>
                        {isEditing && selectedReq.status === 'draft' && (
                          <td className="py-3 px-2 text-center no-print">
                            <button
                              type="button"
                              onClick={() => removeItemFromReq(item.itemId)}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Signature Blocks (Shows beautifully on printed PDF sheets) */}
            <div className="pt-16 grid grid-cols-2 gap-8 text-xs font-sans font-medium text-slate-750">
              <div className="space-y-12">
                <div className="border-t border-slate-500 pt-2 w-48 text-center">
                  Cath Lab Scrub Nurse / Staff
                </div>
                <div className="text-[10px] text-slate-450 italic">
                  Draft generated: {selectedReq.date}
                </div>
              </div>
              <div className="flex flex-col items-end space-y-12">
                <div className="border-t border-slate-500 pt-2 w-48 text-center">
                  HOD, Department of Cardiology
                </div>
                <div className="text-[10px] text-slate-450 italic text-right">
                  Official Stamp & Date
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Confirm Receipt (Adding quantities back to stock) */}
      {isReceiveModalOpen && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 m-0">Confirm Receipt of Stock</h2>
              <button onClick={() => { setIsReceiveModalOpen(false); setReceivingOperator(''); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-left">
              <div className="p-3 bg-blue-50/50 rounded-lg text-xs space-y-1.5 border border-blue-100">
                <p className="font-semibold text-blue-900">Requisition: {selectedReq.requisitionNo}</p>
                <p className="text-slate-650">Confirming this receipt will automatically add the ordered quantities of all {selectedReq.items.length} items back to their active inventory pools and generate "received" audit logs.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Receiving Operator Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter name of staff confirming delivery"
                  value={receivingOperator}
                  onChange={(e) => setReceivingOperator(e.target.value)}
                  className="w-full p-2 border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsReceiveModalOpen(false); setReceivingOperator(''); }}
                  className="px-4 py-2 border border-slate-250 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReceipt}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm text-xs"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
