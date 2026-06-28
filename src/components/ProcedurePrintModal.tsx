import React from 'react';
import { type Procedure } from '../db/db';
import { X, Printer, AlertTriangle } from 'lucide-react';

interface ProcedurePrintModalProps {
  procedure: Procedure;
  onClose: () => void;
}

export const ProcedurePrintModal: React.FC<ProcedurePrintModalProps> = ({ procedure, onClose }) => {
  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-150 flex justify-between items-center text-left">
          <div>
            <h2 className="text-base font-bold text-slate-800 m-0">Procedure Case Records</h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Case ID: {procedure.caseId}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 border border-slate-200 p-1.5 rounded-lg bg-slate-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Contents */}
        <div className="p-6 overflow-y-auto space-y-4 text-left text-xs font-sans">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <p className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Case Details</p>
              <p className="font-semibold text-slate-800 mt-1">Case ID: <span className="font-mono">{procedure.caseId}</span></p>
              <p className="text-slate-700 mt-1">Date: {procedure.date}</p>
              <p className="text-slate-700 mt-1">Operator: {procedure.operator}</p>
            </div>
            <div>
              <p className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Patient & Billing</p>
              <p className="font-semibold text-slate-800 mt-1">Ref: <span className="font-mono">{procedure.patientRef}</span></p>
              <p className="text-slate-700 mt-1">Billing Package: {procedure.pmjayPackageName || 'Cash/General'}</p>
              {procedure.pmjayCeilingAmount ? (
                <p className="text-slate-705 mt-1">Ceiling Amount: {formatRupees(procedure.pmjayCeilingAmount)}</p>
              ) : null}
            </div>
          </div>

          {/* Consumed Items */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Item Details</th>
                  <th className="py-2.5 px-3">Batch/Size</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {procedure.itemsConsumed.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3">
                      <div className="font-bold">{item.name}</div>
                      <div className="text-[9px] text-slate-450 uppercase">{item.category}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px]">
                      <div>{item.batchLotNo}</div>
                      <div>{item.modelSize}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupees(item.unitCost)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">{formatRupees(item.quantity * item.unitCost)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px]">Total Consumables Cost</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatRupees(procedure.totalCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Over Ceiling Details */}
          {procedure.overCeiling && (
            <div className="p-4 bg-rose-55/20 border border-rose-200 rounded-xl space-y-1">
              <p className="font-bold text-rose-800 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Budget Over-Ceiling Warning
              </p>
              <p className="text-slate-800 font-semibold mt-1">
                Exceeded package ceiling by {formatRupees(procedure.totalCost - (procedure.pmjayCeilingAmount || 0))}.
              </p>
              <p className="text-slate-700 italic font-serif mt-1">
                Clinical Justification: "{procedure.overCeilingReason}"
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-slate-250 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 transition-colors">
            Close
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors">
            <Printer className="w-3.5 h-3.5" /> Print Case Record
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY COMPLIANCE SHEET (Invisible on screen, rendered on paper print) */}
      {/* ========================================================================= */}
      <div className="hidden print:block fixed inset-0 bg-white text-slate-900 p-10 font-serif leading-relaxed z-50">
        {/* Letterhead */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
          <h2 className="text-base font-bold uppercase">SHYAM SHAH MEDICAL COLLEGE & ASSOCIATED HOSPITALS, REWA</h2>
          <h3 className="text-xs font-semibold uppercase">DEPARTMENT OF CARDIOLOGY — CATHETERIZATION LABORATORY</h3>
          <p className="text-[10px] italic font-sans text-slate-500">Official Clinical Case Record & Consumable Consumption Sheet</p>
        </div>

        {/* Case Info Table */}
        <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-200 pb-4 mb-6">
          <div className="space-y-1.5">
            <div>Case ID / IPD No: <span className="font-mono font-bold">{procedure.caseId}</span></div>
            <div>Patient Reference: <span className="font-mono font-bold">{procedure.patientRef}</span></div>
            <div>Procedure Date: <span className="font-semibold">{procedure.date}</span></div>
          </div>
          <div className="space-y-1.5 text-right">
            <div>Procedure Type: <span className="font-semibold">{procedure.procedureType}</span></div>
            <div>Linked Package: <span className="font-semibold">{procedure.pmjayPackageName || 'N/A (General)'}</span></div>
            {procedure.pmjayCeilingAmount ? (
              <div>Ceiling Amount: <span className="font-semibold font-mono">{formatRupees(procedure.pmjayCeilingAmount)}</span></div>
            ) : null}
          </div>
        </div>

        {/* Consumed list */}
        <div className="font-sans text-xs mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-700 font-bold uppercase tracking-wider text-[9px]">
                <th className="py-2 px-1">#</th>
                <th className="py-2 px-2">Consumable Item Description</th>
                <th className="py-2 px-2">Batch/Lot No</th>
                <th className="py-2 px-2">Model/Size</th>
                <th className="py-2 px-2 text-center">Qty Used</th>
                <th className="py-2 px-2 text-right">Unit Cost</th>
                <th className="py-2 px-2 text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {procedure.itemsConsumed.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-1 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-[9px] text-slate-450 uppercase">{item.category}</div>
                  </td>
                  <td className="py-2 px-2 font-mono">{item.batchLotNo}</td>
                  <td className="py-2 px-2 font-mono">{item.modelSize}</td>
                  <td className="py-2 px-2 text-center font-mono">{item.quantity}</td>
                  <td className="py-2 px-2 text-right font-mono">{formatRupees(item.unitCost)}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">{formatRupees(item.quantity * item.unitCost)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-800 font-bold bg-slate-50 font-mono text-slate-900 text-xs">
                <td colSpan={6} className="py-2.5 px-2 text-right uppercase tracking-wider text-[9px]">Grand Total Consumables Cost</td>
                <td className="py-2.5 px-2 text-right">{formatRupees(procedure.totalCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Justification if over ceiling */}
        {procedure.overCeiling && (
          <div className="p-4 border border-rose-200 bg-rose-50/20 rounded-lg text-xs font-sans space-y-1 mb-8">
            <p className="font-bold text-rose-850 uppercase tracking-wide text-[9px]">PMJAY Package Exceedance Justification</p>
            <p className="text-slate-800">The total consumable cost of this case exceeded the package ceiling limit by <span className="font-bold">{formatRupees(procedure.totalCost - (procedure.pmjayCeilingAmount || 0))}</span>.</p>
            <p className="text-slate-900 italic font-serif mt-1">
              " {procedure.overCeilingReason} "
            </p>
          </div>
        )}

        {/* Signature columns */}
        <div className="pt-16 grid grid-cols-3 gap-8 text-[9px] font-sans font-medium text-slate-700">
          <div className="space-y-12">
            <div className="border-t border-slate-500 pt-2 text-center">
              Cath Lab Scrub Nurse
            </div>
            <div className="text-[9px] text-slate-400 text-center">
              Name: ______________________
            </div>
          </div>
          <div className="space-y-12">
            <div className="border-t border-slate-500 pt-2 text-center">
              Primary Operator (Cardiologist)
            </div>
            <div className="text-[9px] text-slate-400 text-center">
              Name: ______________________
            </div>
          </div>
          <div className="space-y-12">
            <div className="border-t border-slate-500 pt-2 text-center">
              Cardiology Head of Department
            </div>
            <div className="text-[9px] text-slate-400 text-center">
              Official Stamp & Date
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
