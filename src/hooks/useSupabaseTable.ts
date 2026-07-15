import { useEffect, useState } from 'react';
import { supabase } from '../db/supabaseClient';

export function useSupabaseTable<T>(tableName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const { data: res, error: err } = await supabase
          .from(tableName)
          .select('*');
        if (err) throw err;
        if (active) {
          setData((res as T[]) || []);
        }
      } catch (err) {
        if (active) {
          setError(err);
          console.error(`Error fetching table ${tableName}:`, err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`public:${tableName}-realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [tableName]);

  return { data, loading, error };
}
