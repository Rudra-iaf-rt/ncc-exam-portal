import React, { useEffect, useState } from 'react';
import { examApi } from '../../api';
import { 
  Award, 
  ChevronLeft, 
  Calendar, 
  TrendingUp,
  FileText,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const CadetResults = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { data } = await examApi.getResults();
        if (data) setResults(data.results);
      } catch (error) {
        if (error.status !== 401) {
          console.error('Failed to fetch results:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchResults();
    }
  }, [user]);


  const getPerformanceTag = (score) => {
    if (score >= 80) return { label: 'Distinction', class: 'distinction' };
    if (score >= 60) return { label: 'First Class', class: 'first' };
    if (score >= 40) return { label: 'Pass', class: 'pass' };
    return { label: 'Fail', class: 'fail' };
  };

  return (
    <>
      <header className="mb-12">
        <div className="mb-2 font-mono text-[9px] tracking-[0.18em] text-olive-soft uppercase">Performance Records</div>
        <h1 className="font-display text-4xl text-ink leading-tight sm:text-5xl">Examination History</h1>
      </header>

      {/* Performance Overview */}
      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
         <div className="flex items-center gap-4 rounded-xl border border-stone-deep bg-white p-5 shadow-[0_4px_16px_rgba(26,39,68,0.02)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-navy-wash text-navy">
              <TrendingUp size={20} strokeWidth={1.5} />
            </div>
            <div>
               <span className="block font-mono text-[9px] font-bold tracking-widest text-ink-4 uppercase mb-1">Average Score</span>
               <span className="font-display text-3xl font-medium text-ink leading-none">
                  {results.length > 0 
                    ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) 
                    : 0}%
               </span>
            </div>
         </div>
         
         <div className="flex items-center gap-4 rounded-xl border border-stone-deep bg-white p-5 shadow-[0_4px_16px_rgba(26,39,68,0.02)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-olive-wash text-olive-mid">
              <CheckCircle2 size={20} strokeWidth={1.5} />
            </div>
            <div>
               <span className="block font-mono text-[9px] font-bold tracking-widest text-ink-4 uppercase mb-1">Exams Completed</span>
               <span className="font-display text-3xl font-medium text-ink leading-none">{results.length}</span>
            </div>
         </div>
         
         <div className="flex items-center gap-4 rounded-xl border border-stone-deep bg-white p-5 shadow-[0_4px_16px_rgba(26,39,68,0.02)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-gold-wash text-gold-deep">
              <Award size={20} strokeWidth={1.5} />
            </div>
            <div>
               <span className="block font-mono text-[9px] font-bold tracking-widest text-ink-4 uppercase mb-1">Current Rank</span>
               <span className="font-display text-2xl font-medium text-ink leading-tight mt-1 block">
                  {results.length > 0 ? getPerformanceTag(results[0]?.score || 0).label : 'Unranked'}
               </span>
            </div>
         </div>
      </section>

      {/* Results Table */}
      <section className="rounded-xl border border-stone-deep bg-white shadow-[0_4px_16px_rgba(26,39,68,0.02)] overflow-hidden">
        <div className="border-b border-stone-mid bg-stone-wash/30 px-6 py-5">
          <div className="flex items-center gap-3">
             <div className="h-6 w-1 bg-navy rounded-full"></div>
             <h2 className="font-display text-2xl text-navy">Result Transcript</h2>
          </div>
        </div>

        {loading ? (
           <div className="flex h-[300px] flex-col items-center justify-center gap-4 text-ink-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-deep border-t-navy"></div>
              <span className="font-mono text-[10px] uppercase tracking-widest">Fetching Results...</span>
           </div>
        ) : results.length > 0 ? (
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-stone-wash border-b border-stone-deep">
                      <th className="px-6 py-4 font-mono text-[10px] tracking-widest text-ink-4 uppercase font-medium">Exam Title</th>
                      <th className="px-6 py-4 font-mono text-[10px] tracking-widest text-ink-4 uppercase font-medium">Completion Date</th>
                      <th className="px-6 py-4 font-mono text-[10px] tracking-widest text-ink-4 uppercase font-medium">Final Score</th>
                      <th className="px-6 py-4 font-mono text-[10px] tracking-widest text-ink-4 uppercase font-medium">Performance Status</th>
                   </tr>
                </thead>
                <tbody>
                   {results.map(res => {
                      const perf = getPerformanceTag(res.score);
                      return (
                        <tr key={res.id} className="border-b border-stone-mid transition-colors hover:bg-stone-wash/40 group">
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-3 font-ui text-[15px] font-medium text-ink group-hover:text-navy">
                                 <FileText size={16} className="text-ink-4" />
                                 {res.exam?.title || "Exam Data Unavailable"}
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
                                 <Calendar size={13} className="text-ink-4" />
                                 {new Date(res.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <span className="font-mono text-[14px] font-bold text-navy">
                                {res.score}%
                              </span>
                           </td>
                           <td className="px-6 py-5">
                              <span className={`inline-flex items-center rounded-sm px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider
                                ${perf.class === 'distinction' ? 'bg-gold-wash text-gold-deep border border-gold-pale' : 
                                  perf.class === 'first' ? 'bg-olive-wash text-olive-mid border border-olive-pale' : 
                                  perf.class === 'pass' ? 'bg-stone-wash text-ink-3 border border-stone-deep' : 
                                  'bg-crimson/10 text-crimson border border-crimson/20'
                                }
                              `}>
                                 {perf.label}
                              </span>
                           </td>
                        </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
        ) : (
          <div className="flex h-[300px] flex-col items-center justify-center text-center">
             <div className="mb-4 rounded-full bg-stone-wash p-6 text-ink-4/30">
               <Award size={40} strokeWidth={1.5} />
             </div>
             <p className="font-display text-2xl text-ink font-medium">No Records Found</p>
             <p className="mt-2 font-ui text-[14px] text-ink-4 max-w-[280px]">Complete your first exam to see your performance record here.</p>
          </div>
        )}
      </section>
    </>
  );
};

export default CadetResults;