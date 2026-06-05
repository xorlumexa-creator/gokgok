import { saveItem, getAllItems, deleteItem, STORES } from '@/db/indexedDB';
import { supabase } from '@/integrations/supabase/client';

export interface SyncEvent {
  id: string;
  type: 'baki_update' | 'product_update' | 'hisab_update';
  payload: any;
  timestamp: number;
  retries: number;
}

export async function addToQueue(type: SyncEvent['type'], payload: any): Promise<void> {
  const event: SyncEvent = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };
  await saveItem(STORES.SYNC_QUEUE, event);
}

export async function processQueue(): Promise<void> {
  const queue = await getAllItems(STORES.SYNC_QUEUE) as SyncEvent[];
  if (!queue.length) return;

  const sorted = queue.sort((a, b) => a.timestamp - b.timestamp);

  for (const event of sorted) {
    try {
      await processEvent(event);
      await deleteItem(STORES.SYNC_QUEUE, event.id);
    } catch (error) {
      event.retries += 1;
      if (event.retries >= 3) {
        await deleteItem(STORES.SYNC_QUEUE, event.id);
      } else {
        await saveItem(STORES.SYNC_QUEUE, event);
      }
    }
  }
}

async function processEvent(event: SyncEvent): Promise<void> {
  switch (event.type) {
    case 'baki_update':
      await supabase.from('baki').upsert(event.payload);
      break;
    case 'product_update':
      await supabase.from('products').upsert(event.payload);
      break;
    case 'hisab_update':
      await supabase.from('hisab').upsert(event.payload);
      break;
  }
}

export async function getQueueCount(): Promise<number> {
  const queue = await getAllItems(STORES.SYNC_QUEUE);
  return queue.length;
}
