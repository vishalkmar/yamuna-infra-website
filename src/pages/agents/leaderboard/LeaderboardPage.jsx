import React, { useCallback } from 'react';
import api from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';
import Leaderboard from '../../../components/Leaderboard';

export default function LeaderboardPage() {
  const fetcher = useCallback(async (params) => {
    const { data } = await api.get('/admin/leaderboard', { params });
    return data.data;
  }, []);
  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="Top performing agents" />
      <Leaderboard fetcher={fetcher} />
    </div>
  );
}
