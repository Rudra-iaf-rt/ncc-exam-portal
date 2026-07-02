import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi, examApi } from '../../api';
import { PageHeader, StatCard } from '../components/Shared';
import PageLoader from '../../components/PageLoader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ArrowLeft,
  Users,
  Target,
  Award,
  AlertTriangle
} from 'lucide-react';

export default function ExamAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      examApi.getExamDetails(id),
      adminApi.getExamAnalytics(id)
    ])
    .then(([examRes, analyticsRes]) => {
      setExam(examRes.data.exam);
      setAnalytics(analyticsRes.data);
      setLoading(false);
    })
    .catch(err => {
      toast.error("Failed to load analytics");
      navigate('/admin/results');
    });
  }, [id, navigate]);

  const isInitialLoading = loading || !analytics;

  const { overview, topicPerformance, scoreDistribution, qdi } = analytics || {};

  return (
    <div>
      <PageHeader 
        title={exam ? `Analytics: ${exam.title}` : "Exam Analytics"}
        subtitle="Data-driven insights for examination performance and question quality."
        action={
          <button 
            onClick={() => navigate('/admin/results')}
            className="h-[36px] px-4 rounded-md font-ui text-[13px] font-medium flex items-center gap-2 bg-stone text-ink-2 border border-stone-deep hover:bg-stone-mid transition-all"
          >
            <ArrowLeft size={16} />
            <span>Back to Results</span>
          </button>
        }
      />

      {isInitialLoading ? (
        <PageLoader text="Crunching analytics..." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard 
              label="Total Attempts" 
              value={overview?.totalAttempts || 0} 
              icon={<Users size={18} strokeWidth={1.5} />}
              colorClass="text-navy"
            />
            <StatCard 
              label="Average Score" 
          value={`${overview.averageScore} / ${overview.maxPossible}`} 
          icon={<Target size={18} strokeWidth={1.5} />}
          colorClass="text-olive"
        />

        <StatCard 
          label="Highest Score" 
          value={overview.highestScore} 
          icon={<Award size={18} strokeWidth={1.5} />}
          colorClass="text-[#D97757]"
        />

        <StatCard 
          label="Lowest Score" 
          value={overview.lowestScore} 
          icon={<AlertTriangle size={18} strokeWidth={1.5} />}
          colorClass="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white border border-stone-deep rounded-md shadow-sm p-6">
          <h3 className="font-display text-[15px] font-medium text-navy mb-6 flex items-center gap-2">
            <BarChartIcon size={18} className="text-ink-3" />
            Score Distribution
          </h3>
          <div className="h-[300px]">
            {scoreDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#808080' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#808080' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: '#F5F5F5' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5', fontSize: '13px' }} />
                  <Bar dataKey="count" name="Cadets" fill="#0A2540" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-4 text-[13px] font-ui">No data available</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-deep rounded-md shadow-sm p-6">
          <h3 className="font-display text-[15px] font-medium text-navy mb-6 flex items-center gap-2">
            <PieChartIcon size={18} className="text-ink-3" />
            Topic Performance (Radar)
          </h3>
          <div className="h-[300px]">
            {topicPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={topicPerformance}>
                  <PolarGrid stroke="#E5E5E5" />
                  <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11, fill: '#404040' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#808080' }} />
                  <Radar name="Performance %" dataKey="performancePercentage" stroke="#5F6B45" fill="#5F6B45" fillOpacity={0.4} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5', fontSize: '13px' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-4 text-[13px] font-ui">No data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md border border-stone-deep shadow-sm overflow-hidden mb-12">
        <div className="px-6 py-4 border-b border-stone-deep bg-stone/30">
          <h2 className="font-display font-medium text-navy">Question Difficulty Index (QDI)</h2>
          <p className="text-[12px] font-ui text-ink-4 mt-1">Lower QDI means the question was harder (fewer cadets answered correctly).</p>
        </div>
        
        {qdi.length === 0 ? (
          <div className="p-12 text-center text-ink-4 font-ui text-[14px]">
            No difficulty data available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                  <th className="font-normal px-4 py-3">Topic</th>
                  <th className="font-normal px-4 py-3">Question ID</th>
                  <th className="font-normal px-4 py-3">QDI (Correct Rate)</th>
                  <th className="font-normal px-4 py-3">Difficulty</th>
                </tr>
              </thead>
              <tbody className="font-ui text-[13.5px] text-ink-2">
                {qdi.map((q) => {
                  let diffLevel = 'Moderate';
                  let diffColor = 'text-yellow-600 bg-yellow-100';
                  
                  if (q.qdi < 0.3) {
                    diffLevel = 'Hard';
                    diffColor = 'text-red-700 bg-red-100';
                  } else if (q.qdi > 0.7) {
                    diffLevel = 'Easy';
                    diffColor = 'text-green-700 bg-green-100';
                  }

                  return (
                    <tr key={q.questionId} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                      <td className="px-4 py-3 font-medium text-navy">{q.topic}</td>
                      <td className="px-4 py-3 font-mono text-ink-4">#{q.questionId}</td>
                      <td className="px-4 py-3 font-mono">
                        <div className="flex items-center gap-3">
                          <span>{(q.qdi * 100).toFixed(0)}%</span>
                          <div className="w-[100px] h-1.5 bg-stone-deep rounded-full overflow-hidden">
                            <div className="h-full bg-navy" style={{ width: `${q.qdi * 100}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wide ${diffColor}`}>
                          {diffLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
