import React, { useEffect, useState } from 'react';
import { generalApi } from '../../api';
import { 
  BookOpen, 
  ChevronLeft, 
  FileText, 
  Download,
  ExternalLink,
  Search,
  Tag,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CadetMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data } = await generalApi.getMaterials();
      if (data) setMaterials(data.materials);
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="mb-12">
        <div className="mb-2 font-mono text-[9px] tracking-[0.18em] text-olive-soft uppercase">Reference Materials</div>
        <h1 className="font-display text-4xl text-ink leading-tight sm:text-5xl">Study Repository</h1>
      </header>

      <section className="mb-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-stone-mid pb-4">
          <div>
            <h2 className="font-display text-3xl text-ink font-medium">Field Manuals</h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">Documentation & Manuals</p>
          </div>
          
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={16} />
            <input 
              type="text" 
              placeholder="Search repository..." 
              className="w-full rounded-md border border-stone-deep bg-white py-2 pl-10 pr-4 text-[13.5px] font-ui transition-all focus:border-navy-soft focus:outline-none focus:ring-4 focus:ring-navy-wash sm:w-[260px]"
            />
          </div>
        </div>

        <div className="min-h-[300px]">
          {loading ? (
             <div className="flex h-[300px] flex-col items-center justify-center gap-4 text-ink-4">
               <Loader2 className="mb-4 animate-spin" size={40} />
               <span className="font-mono text-sm uppercase tracking-widest">Syncing Library...</span>
             </div>
          ) : materials.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {materials.map(item => (
                <div key={item.id} className="group relative flex flex-col gap-6 rounded-xl border border-stone-deep bg-white p-6 transition-all hover:-translate-y-1 hover:border-navy-pale hover:shadow-[0_4px_16px_rgba(26,39,68,0.06)]">
                   <div className="flex items-start justify-between">
                     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-stone-wash text-navy transition-colors group-hover:bg-navy-wash">
                        <FileText size={24} strokeWidth={1.5} />
                     </div>
                     <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-wash text-ink-3 transition-all hover:bg-navy hover:text-white"
                        title={item.url.includes('http') ? 'View Source' : 'Download Document'}
                      >
                         {item.url.includes('http') ? <ExternalLink size={18} /> : <Download size={18} />}
                      </a>
                   </div>
                   
                   <div className="flex flex-1 flex-col">
                      <h3 className="mb-2 font-display text-xl text-ink group-hover:text-navy transition-colors">{item.title}</h3>
                      {item.description && <p className="mb-4 line-clamp-2 font-ui text-[14px] text-ink-3">{item.description}</p>}
                      <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-stone-wash pt-4">
                         {item.exam && (
                           <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
                              <Tag size={12} className="text-ink-4" />
                              <span>{item.exam.title}</span>
                           </div>
                         )}
                         <span className="rounded-sm bg-stone-wash px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-3">
                           {item.type}
                         </span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center text-center rounded-xl border border-dashed border-stone-deep bg-white/50">
               <div className="mb-4 rounded-full bg-stone-wash p-5 text-ink-4/40">
                 <BookOpen size={32} strokeWidth={1.5} />
               </div>
               <p className="font-display text-2xl text-ink font-medium">Repository Empty</p>
               <p className="mt-2 font-ui text-[14px] uppercase tracking-wider text-ink-4">No study materials have been issued yet.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default CadetMaterials;
