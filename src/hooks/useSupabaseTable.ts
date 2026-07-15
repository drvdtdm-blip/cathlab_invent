import { useEffect, useState } from 'react';
import { supabase } from '../db/supabaseClient';

export function useSupabaseTable<T>(tableName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const isDummy = supabaseUrl.includes('your-project-id') || !supabaseUrl;

    if (isDummy) {
      setData([]);
      setLoading(false);
      return;
    }

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

    // Subscribe to realtime changes safely
    let channel: any = null;
    try {
      channel = supabase
        .channel(`public:${tableName}-realtime`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          () => {
            fetchData();
          }
        )
        .subscribe();
    } catch (subErr) {
      console.error(`Failed to subscribe to realtime for ${tableName}:`, subErr);
    }

    return () => {
      active = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (unsubErr) {
          console.error(`Failed to unsubscribe for ${tableName}:`, unsubErr);
        }
      }
    };
  }, [tableName]);

  return { data, loading, error };
}
