import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export function useSupabaseTable<T>(tableName: string) {
  // Map Supabase table names to local Dexie tables
  const dexieTableMap: Record<string, any> = {
    'items': db.items,
    'procedures': db.procedures,
    'pmjay_packages': db.pmjayPackages,
    'ledger': db.ledger,
    'requisitions': db.requisitions
  };

  const table = dexieTableMap[tableName];

  const data = useLiveQuery(
    async () => {
      if (!table) return [];
      return await table.toArray();
    },
    [tableName]
  ) || [];

  return {
    data: data as T[],
    loading: false,
    error: null,
    refetch: () => {}
  };
}
