import { supabase } from './supabaseClient';

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
  cathLab?: string; // Which theater (Cathlab 1 or Cathlab 2)
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
  officeNo?: string; // Office Reference / Dispatch Number
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

class SupabaseTableWrapper<T> {
  tableName: string;
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async toArray(): Promise<T[]> {
    const { data, error } = await supabase.from(this.tableName).select('*');
    if (error) {
      console.error(`Error in toArray for ${this.tableName}:`, error);
      throw error;
    }
    return (data || []) as unknown as T[];
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error in count for ${this.tableName}:`, error);
      throw error;
    }
    return count || 0;
  }

  async get(id: number | string): Promise<T | undefined> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error(`Error in get for ${this.tableName} (id=${id}):`, error);
      throw error;
    }
    return data as T | undefined;
  }

  async add(item: Omit<T, 'id'>): Promise<number> {
    // Clean out any undefined or null id values to prevent database issues
    const payload = { ...item } as any;
    delete payload.id;

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error(`Error in add for ${this.tableName}:`, error, payload);
      throw error;
    }
    return (data as any).id;
  }

  async put(item: T): Promise<number> {
    const { data, error } = await supabase
      .from(this.tableName)
      .upsert(item as any)
      .select()
      .single();
    if (error) {
      console.error(`Error in put for ${this.tableName}:`, error, item);
      throw error;
    }
    return (data as any).id;
  }

  async delete(id: number | string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    if (error) {
      console.error(`Error in delete for ${this.tableName} (id=${id}):`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .neq('id', -1);
    if (error) {
      console.error(`Error in clear for ${this.tableName}:`, error);
      throw error;
    }
  }

  where(field: string) {
    return {
      equals: (val: any) => {
        return {
          reverse: () => {
            return {
              sortBy: async (sortField: string): Promise<T[]> => {
                const { data, error } = await supabase
                  .from(this.tableName)
                  .select('*')
                  .eq(field, val)
                  .order(sortField, { ascending: false });
                if (error) {
                  console.error(`Error in where.equals.reverse.sortBy for ${this.tableName}:`, error);
                  throw error;
                }
                return (data || []) as unknown as T[];
              }
            };
          },
          sortBy: async (sortField: string): Promise<T[]> => {
            const { data, error } = await supabase
              .from(this.tableName)
              .select('*')
              .eq(field, val)
              .order(sortField, { ascending: true });
            if (error) {
              console.error(`Error in where.equals.sortBy for ${this.tableName}:`, error);
              throw error;
            }
            return (data || []) as unknown as T[];
          },
          toArray: async (): Promise<T[]> => {
            const { data, error } = await supabase
              .from(this.tableName)
              .select('*')
              .eq(field, val);
            if (error) {
              console.error(`Error in where.equals.toArray for ${this.tableName}:`, error);
              throw error;
            }
            return (data || []) as unknown as T[];
          }
        };
      }
    };
  }
}

export const db = {
  items: new SupabaseTableWrapper<Item>('items'),
  ledger: new SupabaseTableWrapper<LedgerEntry>('ledger'),
  pmjayPackages: new SupabaseTableWrapper<PmjayPackage>('pmjay_packages'),
  procedures: new SupabaseTableWrapper<Procedure>('procedures'),
  requisitions: new SupabaseTableWrapper<Requisition>('requisitions'),

  async transaction(
    _mode: string,
    _tables: any[],
    callback: () => Promise<any>
  ): Promise<any> {
    return callback();
  }
};
