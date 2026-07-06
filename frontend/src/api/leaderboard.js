import apiClient from './client';

export const leaderboardApi = {
  getUnitLeaderboard: (collegeCode) => apiClient.get(`/leaderboard/unit/${collegeCode}`),
  getMyRank: () => apiClient.get('/leaderboard/my-rank'),
};

export default leaderboardApi;
