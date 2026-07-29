import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Calendar, FileText } from 'lucide-react';

export default function QuickActions({ isAdmin }) {
  // Impeccable animate: 150-250ms transitions, subtle scale on hover, scale down on active.
  const baseBtnClass = "h-[44px] px-5 rounded-lg font-ui text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] group/btn";

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {isAdmin ? (
        <>
          <Link 
            to="/admin/exams/create" 
            className={`${baseBtnClass} bg-navy text-white hover:bg-navy-soft shadow-sm hover:shadow-md`}
          >
            <Plus size={16} />
            Create New Exam
          </Link>
          <Link 
            to="/admin/assignments" 
            className={`${baseBtnClass} bg-white text-navy border border-stone-deep hover:border-navy/30 hover:bg-stone-wash shadow-sm hover:shadow-md`}
          >
            <Calendar size={16} className="text-ink-3 group-hover/btn:text-navy transition-colors" />
            Schedule Exam
          </Link>
          <Link 
            to="/admin/results" 
            className={`${baseBtnClass} bg-white text-navy border border-stone-deep hover:border-navy/30 hover:bg-stone-wash shadow-sm hover:shadow-md ml-auto`}
          >
            <FileText size={16} className="text-ink-3 group-hover/btn:text-navy transition-colors" />
            All Results
            <ArrowRight size={14} className="ml-1 text-ink-4 group-hover/btn:text-navy transition-colors group-hover/btn:translate-x-1" />
          </Link>
        </>
      ) : (
        <Link 
          to="/admin/results" 
          className={`${baseBtnClass} bg-navy text-white hover:bg-navy-soft shadow-sm hover:shadow-md`}
        >
          Review Performance
          <ArrowRight size={14} className="ml-1 text-white/70 group-hover/btn:text-white transition-colors group-hover/btn:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
