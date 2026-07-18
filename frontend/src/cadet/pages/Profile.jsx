import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { examApi, leaderboardApi } from '../../api';
import { Lock } from 'lucide-react';
import CadetProfileView from '../../components/profile/CadetProfileView';

const CadetProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    examsTaken: 0,
    avgScore: 0,
    globalRank: '-',
    bestScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const [resultsRes, rankRes] = await Promise.all([
          examApi.getResults().catch(() => ({ data: { results: [] } })),
          leaderboardApi.getMyRank().catch(() => ({ data: null }))
        ]);

        const results = resultsRes?.data?.results || [];
        const examsTaken = results.length;
        
        let bestScore = 0;
        let avgScore = 0;
        
        if (examsTaken > 0) {
          const totalScore = results.reduce((acc, curr) => acc + (curr.score || 0), 0);
          avgScore = Math.round(totalScore / examsTaken);
          bestScore = Math.max(...results.map(r => r.score || 0));
        }

        const rankData = rankRes?.data;
        const globalRank = rankData?.rank ? `#${rankData.rank}` : 'Unranked';

        setStats({
          examsTaken,
          avgScore,
          globalRank,
          bestScore
        });
      } catch (err) {
        console.error("Failed to fetch profile stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="w-full max-w-5xl mx-auto font-ui pb-24">
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-display font-semibold text-ink tracking-tight">Cadet Profile</h1>
        <p className="text-[14px] text-ink-4 mt-1">Manage your official NCC records and performance.</p>
      </div>

      <CadetProfileView 
        user={user} 
        stats={stats} 
        loadingStats={loading} 
        actions={[
          {
            icon: Lock,
            label: 'Change Password',
            onClick: () => navigate('/cadet/settings/password')
          }
        ]}
      />
    </div>
  );
};

export default CadetProfile;
