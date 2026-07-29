import { Trophy } from 'lucide-react';

export default function LeaderboardWidget({ leaderboard }) {
  return (
    <div className="flex flex-col h-full border border-stone-deep bg-white rounded-sm">
      <div className="flex justify-between items-center p-3 border-b border-stone-deep bg-stone-wash">
        <h3 className="m-0 font-mono text-[11px] font-bold uppercase tracking-wider text-navy flex items-center gap-2">
          <Trophy size={14} className="text-gold-3" />
          Top Performers
        </h3>
      </div>
      
      <div className="flex flex-col flex-1 overflow-y-auto">
        {leaderboard && leaderboard.length > 0 ? (
          leaderboard.slice(0, 5).map((cadet, i) => (
            <div 
              key={cadet.studentId} 
              className={`p-3 flex justify-between items-center hover:bg-stone-wash transition-colors ${i !== Math.min(leaderboard.length, 5) - 1 ? 'border-b border-stone-deep' : ''}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className={`font-mono text-[11px] font-bold w-4 text-center ${
                  i === 0 ? 'text-gold-3' : 
                  i === 1 ? 'text-stone-400' : 
                  i === 2 ? 'text-amber-700' : 'text-ink-4'
                }`}>
                  {cadet.rank}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-ui text-[12px] font-bold text-navy uppercase tracking-wide truncate">{cadet.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-ink-4">{cadet.regimentalNumber}</span>
                    {cadet.collegeCode && (
                      <>
                        <span className="text-stone-deep text-[10px]">|</span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-navy-soft">{cadet.collegeCode}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 pl-4">
                <span className="font-mono text-[12px] font-bold text-navy">{cadet.averageScore}%</span>
                <span className="font-mono text-[9px] text-ink-4 uppercase tracking-wider">{cadet.examsTaken} {cadet.examsTaken === 1 ? 'EXAM' : 'EXAMS'}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-4">Insufficient Data</span>
          </div>
        )}
      </div>
    </div>
  );
}
