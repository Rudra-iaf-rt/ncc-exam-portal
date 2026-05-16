import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  Award, 
  Clock, 
  Search, 
  ChevronRight,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { examApi } from '../../api';
import { toast } from 'sonner';

const CadetDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignedExams, resultsRes] = await Promise.all([
          examApi.getAssigned().catch(() => []),
          examApi.getResults().catch(() => ({ data: { results: [] } }))
        ]);
        setExams(assignedExams || []);
        if (resultsRes?.data) {
          setResults(resultsRes.data.results || []);
        }
      } catch (err) {
        if (err.status !== 401) {
          toast.error('Failed to sync with unit servers.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const calculatePerformance = () => {
    if (!results || results.length === 0) return '--%';
    const total = results.reduce((acc, r) => acc + (r.score || 0), 0);
    return `${Math.round(total / results.length)}%`;
  };

  const filteredExams = searchTerm.trim()
    ? exams.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : exams;

  const pendingCount = exams.filter(e => !e.completed).length;

  return (
    <>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-stone-mid pb-6">
        <div>
          <div className="mb-1 font-mono text-[10px] tracking-[0.12em] text-ink-4 uppercase">NCC Exam Portal</div>
          <h1 className="font-display text-3xl text-ink leading-tight">
            Welcome, <span className="text-navy-soft font-semibold">{user?.name || 'Cadet'}</span>
          </h1>
          <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-ink-3">
            <span className="bg-stone-mid/50 px-2 py-0.5 rounded text-navy font-medium">
              {user?.regimentalNumber || 'NCC-2024'}
            </span>
            <span className="text-stone-deep">|</span>
            <span>{user?.college || 'NCC Tirupati Unit'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 rounded-lg bg-white border border-stone-deep p-4 sm:px-6 sm:py-3 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 border-r border-stone-mid pr-4 sm:pr-6">
            <div className="text-navy-soft"><FileText size={18} /></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-ink-4 leading-none mb-1">Assigned</span>
              <span className="text-lg font-bold leading-none text-ink">{exams.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 border-r border-stone-mid pr-4 sm:pr-6">
            <div className="text-amber-600"><Clock size={18} /></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-ink-4 leading-none mb-1">Pending</span>
              <span className="text-lg font-bold leading-none text-ink">{pendingCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-emerald-600"><Award size={18} /></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-ink-4 leading-none mb-1">Avg Score</span>
              <span className="text-lg font-bold leading-none text-ink">{calculatePerformance()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Assignments Section */}
      <section>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink font-semibold">Available Examinations</h2>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-4">Assigned to your profile</p>
          </div>
          
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={14} />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-stone-deep bg-white py-1.5 pl-9 pr-4 text-[13px] font-ui transition-all focus:border-navy-soft focus:outline-none focus:ring-2 focus:ring-navy-wash sm:w-[240px]"
            />
          </div>
        </div>

        <div className="min-h-[300px]">
          {loading ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-deep border-t-navy"></div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-4">Retrieving assignments...</p>
            </div>
          ) : filteredExams.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filteredExams.map((exam) => (
                <div key={exam.id} className={`group relative flex flex-col justify-between rounded-lg border bg-white p-5 transition-all ${
                  exam.completed
                    ? 'border-olive-pale opacity-80 hover:shadow-sm'
                    : 'border-stone-deep hover:border-navy-pale hover:shadow-[0_4px_12px_rgba(26,39,68,0.04)]'
                }`}>
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-ui text-[18px] font-semibold text-ink group-hover:text-navy transition-colors leading-tight pr-4">{exam.title}</h3>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-stone-wash text-ink-3 transition-colors group-hover:bg-navy-wash group-hover:text-navy">
                        <FileText size={16} strokeWidth={1.5} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mb-5">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-ink-3 bg-stone-wash px-2 py-0.5 rounded">
                        <Clock size={11} className="text-ink-4" />
                        <span>{exam.duration} Min</span>
                      </div>
                      {exam.questionCount != null && (
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-ink-3 bg-stone-wash px-2 py-0.5 rounded">
                          <span>{exam.questionCount} Qs</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 font-mono text-[10px] bg-olive-wash px-2 py-0.5 rounded text-olive-mid border border-olive-pale/30">
                        <ShieldCheck size={11} />
                        <span>Proctored</span>
                      </div>
                    </div>
                  </div>

                  {exam.completed ? (
                    <div className="flex items-center justify-between rounded-md bg-olive-wash border border-olive-pale px-4 py-3">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-olive-mid">Completed</span>
                      <span className="font-display text-2xl font-semibold text-olive-mid">{exam.score ?? '--'}%</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(`/exam/${exam.id}`)}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-navy py-[10px] font-ui text-[13px] font-medium text-[#F4F0E4] transition-all hover:bg-navy-mid hover:shadow-md active:scale-[0.98]"
                    >
                      START EXAMINATION
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center text-center rounded-xl border border-dashed border-stone-deep bg-white/50">
              <div className="mb-4 rounded-full bg-stone-wash p-5 text-ink-4/40">
                <FileText size={32} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-2xl text-ink font-medium">
                {searchTerm ? 'No Matching Exams' : 'No Active Exams'}
              </h3>
              <p className="mt-2 max-w-[280px] font-ui text-[14px] text-ink-3">
                {searchTerm
                  ? `No exams match "${searchTerm}". Try a different search.`
                  : 'There are no examinations currently assigned to your profile.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default CadetDashboard;
