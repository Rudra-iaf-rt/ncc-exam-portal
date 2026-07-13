import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppNavigation } from '../../contexts/NavigationContext';
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
  Trophy,
  ArrowLeft,
  Users,
  Target,
  Award,
  AlertTriangle,
  Eye
} from 'lucide-react';

export default function ExamAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { goBack } = useAppNavigation();
  const [analytics, setAnalytics] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

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
      goBack('/admin/results');
    });
  }, [id, goBack]);

  const isInitialLoading = loading || !analytics;

  const { overview, scoreDistribution, qdi, topPerformers } = analytics || { 
    overview: null, scoreDistribution: [], qdi: [], topPerformers: [] 
  };

  return (
    <div>
      <PageHeader 
        title={exam ? `Analytics: ${exam.title}` : "Exam Analytics"}
        subtitle="Data-driven insights for examination performance and question quality."
        action={
          <button 
            onClick={() => goBack('/admin/results')}
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
              value={`${overview?.averageScore || 0} / ${overview?.maxPossible || 0}`} 
              icon={<Target size={18} strokeWidth={1.5} />}
              colorClass="text-olive"
            />
            <StatCard 
              label="Highest Score" 
              value={overview?.highestScore || 0} 
              icon={<Award size={18} strokeWidth={1.5} />}
              colorClass="text-[#D97757]"
            />
            <StatCard 
              label="Lowest Score" 
              value={overview?.lowestScore || 0} 
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

        <div className="bg-white border border-stone-deep rounded-md shadow-sm p-6 overflow-hidden flex flex-col">
          <h3 className="font-display text-[15px] font-medium text-navy mb-6 flex items-center gap-2">
            <Trophy size={18} className="text-[#D97757]" />
            Top 5% Performers
          </h3>
          <div className="flex-1 overflow-y-auto pr-2">
            {topPerformers && topPerformers.length > 0 ? (
              <div className="space-y-2">
                {topPerformers.map((cadet, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-md bg-stone/20 border border-stone/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold ${
                        idx === 0 ? 'bg-[#D97757]/10 text-[#D97757]' : 
                        idx === 1 ? 'bg-stone-deep text-navy' : 
                        idx === 2 ? 'bg-[#B46A36]/10 text-[#B46A36]' : 
                        'bg-stone-deep/50 text-ink-3'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-[13px] text-navy font-display leading-tight">{cadet.name}</div>
                        <div className="text-[11px] text-ink-4 font-mono leading-tight mt-0.5">{cadet.regimentalNumber}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[14px] text-olive leading-tight">{cadet.score}</div>
                      <div className="text-[10px] text-ink-4 uppercase tracking-wider font-mono mt-0.5 leading-tight">Marks</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-4 text-[13px] font-ui min-h-[200px]">No results available</div>
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
                      <th className="font-normal px-4 py-2 w-[80px]">Q ID</th>
                      <th className="font-normal px-4 py-2">Snippet</th>
                      <th className="font-normal px-4 py-2 w-[90px]">Attempts</th>
                      <th className="font-normal px-4 py-2 w-[160px]">QDI (Correct Rate)</th>
                      <th className="font-normal px-4 py-2 w-[100px]">Difficulty</th>
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

                      const fullQuestionText = analytics?.questionDetails?.[q.questionId]?.text || q.text || "Question text preview...";

                      return (
                        <tr 
                          key={q.questionId} 
                          onClick={() => setSelectedQuestion({ ...q, fullText: fullQuestionText })}
                          className="border-b border-stone-deep hover:bg-stone-wash/50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[12px] text-navy font-medium">Q{q.questionId}</span>
                              <Eye size={12} className="text-ink-4 opacity-30 group-hover:opacity-80 transition-opacity" />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[12.5px] text-ink-2 line-clamp-1" title={fullQuestionText}>
                              {fullQuestionText.length > 50 ? fullQuestionText.substring(0, 50) + '...' : fullQuestionText}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-[12px] text-ink-3">
                            {q.attempts !== undefined ? q.attempts : '-'}
                          </td>
                          <td className="px-4 py-2 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px]">{(q.qdi * 100).toFixed(0)}%</span>
                              <div className="w-[70px] h-1.5 bg-stone-deep rounded-full overflow-hidden">
                                <div className="h-full bg-navy" style={{ width: `${q.qdi * 100}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-mono tracking-wide ${diffColor}`}>
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
      {selectedQuestion && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-stone-deep animate-in fade-in zoom-in-95 duration-200">
            <div className="shrink-0 px-6 py-4 border-b border-stone-deep flex justify-between items-center bg-stone/30">
              <h3 className="font-display font-medium text-navy">Question Details (Q{selectedQuestion.questionId})</h3>
              <button onClick={() => setSelectedQuestion(null)} className="text-ink-3 hover:text-navy transition-colors">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <span className="text-[11px] font-mono tracking-wider uppercase text-ink-4">Question Text</span>
                <p className="mt-2 text-[15px] text-ink-1 leading-relaxed bg-stone-wash p-4 rounded-md border border-stone-deep">
                  {selectedQuestion.fullText || "Full question text will appear here."}
                </p>
                {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <span className="text-[11px] font-mono tracking-wider uppercase text-ink-4">Options</span>
                    {selectedQuestion.options.map((opt, idx) => {
                      const isCorrect = selectedQuestion.answer && opt === selectedQuestion.answer;
                      return (
                        <div 
                          key={idx} 
                          className={`p-3 text-[14px] rounded-md border ${
                            isCorrect 
                              ? 'bg-green-50 border-green-200 text-green-900 font-medium' 
                              : 'bg-white border-stone-deep text-ink-2'
                          }`}
                        >
                          <span className="inline-block w-6 font-mono opacity-50">{String.fromCharCode(65 + idx)}.</span> 
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-stone-deep">
                <div>
                  <span className="text-[11px] font-mono tracking-wider uppercase text-ink-4 block">Correct Rate (QDI)</span>
                  <span className="font-mono text-navy text-[16px] font-medium mt-1 block">
                    {(selectedQuestion.qdi * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono tracking-wider uppercase text-ink-4 block">Difficulty</span>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[11px] font-mono tracking-wide ${
                    selectedQuestion.qdi < 0.3 ? 'text-red-700 bg-red-100' :
                    selectedQuestion.qdi > 0.7 ? 'text-green-700 bg-green-100' :
                    'text-yellow-600 bg-yellow-100'
                  }`}>
                    {selectedQuestion.qdi < 0.3 ? 'Hard' : selectedQuestion.qdi > 0.7 ? 'Easy' : 'Moderate'}
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0 px-6 py-4 border-t border-stone-deep bg-stone-wash flex justify-end">
              <button 
                onClick={() => setSelectedQuestion(null)}
                className="px-4 py-2 bg-white border border-stone-deep text-navy text-[13px] font-medium rounded-md hover:bg-stone-light transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
