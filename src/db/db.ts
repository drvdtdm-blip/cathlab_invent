import Dexie, { type Table } from 'dexie';

export interface Item {
  id?: number;
  name: string;
  category: 'guidewire' | 'balloon' | 'stent' | 'catheter' | 'sheath' | 'pacemaker' | 'closure device' | 'consumable' | 'other';
  manufacturer: string;
  modelSize: string;
  batchLotNo: string;
  expiryDate: string; // YYYY-MM-DD
  unitCost: number;
  currentQuantity: number;
  reorderLevel: number;
  storageLocation: string;
}

export interface LedgerEntry {
  id?: number;
  itemId: number;
  itemName: string; // denormalized
  category: string;
  timestamp: number; // epoch ms
  type: 'received' | 'consumed' | 'adjusted' | 'expired';
  quantityChanged: number; // positive for addition, negative for subtraction
  quantityAfter: number;
  operator: string;
  referenceId?: string; // Case ID, Requisition ID, or adjustment context
  reason?: string; // e.g. "Physical audit adjustment", "Damaged product"
}

export interface PmjayPackage {
  id?: number;
  code: string;
  name: string;
  ceilingAmount: number;
  defaultConsumables: { itemId: number; quantity: number }[]; // list of defaults
}

export interface Procedure {
  id?: number;
  caseId: string;
  date: string; // YYYY-MM-DD
  timestamp?: number; // epoch ms (added for audit lock check)
  patientRef: string; // "Initials / UHID" format
  procedureType: string;
  operator: string; // Consultant Cardiologist
  technician?: string; // Catheterization Technician (Data Entry)
  pmjayPackageId?: number;
  pmjayPackageName?: string;
  pmjayCeilingAmount?: number;
  itemsConsumed: {
    itemId: number;
    name: string;
    category: string;
    modelSize: string;
    batchLotNo: string;
    quantity: number;
    unitCost: number;
  }[];
  totalCost: number;
  overCeiling: boolean;
  overCeilingReason?: string;
}

export interface Requisition {
  id?: number;
  requisitionNo: string; // R-YYYYMMDD-XXXX
  date: string;
  status: 'draft' | 'submitted' | 'received';
  type: 'auto' | 'manual';
  operator: string;
  items: {
    itemId: number;
    name: string;
    category: string;
    manufacturer: string;
    modelSize: string;
    currentQuantity: number;
    reorderLevel: number;
    orderQuantity: number;
  }[];
}

export class CathLabInventoryDatabase extends Dexie {
  items!: Table<Item>;
  ledger!: Table<LedgerEntry>;
  pmjayPackages!: Table<PmjayPackage>;
  procedures!: Table<Procedure>;
  requisitions!: Table<Requisition>;

  constructor() {
    super('CathLabInventoryDB');
    this.version(1).stores({
      items: '++id, name, category, expiryDate, currentQuantity',
      ledger: '++id, itemId, timestamp, type, operator, referenceId',
      pmjayPackages: '++id, code, name',
      procedures: '++id, caseId, date, patientRef, procedureType, operator, pmjayPackageId, overCeiling',
      requisitions: '++id, requisitionNo, date, status, type, operator',
    });
  }
}

export const db = new CathLabInventoryDatabase();
