import { useEffect, useState } from 'react';
import { isOnline, subscribeOnlineStatus } from '@/lib/connectivity';

export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    return subscribeOnlineStatus(setOnline);
  }, []);

  return online;
}
