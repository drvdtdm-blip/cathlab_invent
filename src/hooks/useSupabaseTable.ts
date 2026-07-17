import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../db/supabaseClient';

export function useSupabaseTable<T>(tableName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const isDummy = supabaseUrl.includes('your-project-id') || !supabaseUrl;

      if (isDummy) {
        setData([]);
        setLoading(false);
        return;
      }

      const { data: res, error: err } = await supabase
        .from(tableName)
        .select('*');
      if (err) throw err;
      setData((res as T[]) || []);
    } catch (err) {
      setError(err);
      console.error(`Error fetching table ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
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
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (unsubErr) {
          console.error(`Failed to unsubscribe for ${tableName}:`, unsubErr);
        }
      }
    };
  }, [tableName, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
