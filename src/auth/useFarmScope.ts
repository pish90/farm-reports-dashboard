import { useEffect, useState } from 'react';
import { getFarmSummaries } from '../api/reports';
import type { FarmSummaryDto } from '../types';
import { useAuth } from './AuthContext';

export function canSeeAllFarms(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'OPERATIONS_MANAGER';
}

/** Farm-scoping shared by pages that are farm-scoped but multi-farm for ADMIN/OPERATIONS_MANAGER. */
export function useFarmScope() {
  const { user } = useAuth();
  const multiFarm = canSeeAllFarms(user?.role);
  const [farms, setFarms] = useState<FarmSummaryDto[]>([]);
  const [farmId, setFarmId] = useState<number | null>(multiFarm ? null : user?.farmId ?? null);
  const [loading, setLoading] = useState(multiFarm);

  useEffect(() => {
    if (!multiFarm) return;
    getFarmSummaries()
      .then((data) => {
        setFarms(data);
        setFarmId((current) => current ?? data[0]?.farmId ?? null);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [multiFarm]);

  return { farms, farmId, setFarmId, multiFarm, loading };
}
