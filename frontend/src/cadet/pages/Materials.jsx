import React, { useEffect, useState } from 'react';
import { generalApi, materialsApi } from '../../api';
import { 
  BookOpen, 
  ChevronLeft, 
  FileText, 
  Download,
  ExternalLink,
  Search,
  Tag,
  Loader2,
  Video,
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCachedResource, getOrFetchResource } from '../../lib/resourceCache';
import PageLoader from '../../components/PageLoader';

// ─── File size formatter ───────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CadetMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const cacheKey = 'cadet-materials';
    const cached = getCachedResource(cacheKey);

    if (cached) {
      setMaterials(cached.materials || []);
      setLoading(false);
    }

    fetchMaterials(() => cancelled, cacheKey);
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchMaterials = async (isCancelled = () => false, cacheKey = 'cadet-materials') => {
    try {
      const data = await getOrFetchResource(
        cacheKey,
        async () => {
          const response = await generalApi.getMaterials();
          return { materials: response?.data?.materials || [] };
        },
        { staleTimeMs: 2 * 60 * 1000 }
      );
      if (!isCancelled()) setMaterials(data.materials || []);
    } catch (error) {
      if (!isCancelled()) console.error('Failed to fetch materials:', error);
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(
    (m) =>
      m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.fileType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <header className="mb-12">
        <div className="mb-2 font-mono text-[9px] tracking-[0.18em] text-olive-soft uppercase">Reference Materials</div>
        <h1 className="font-display text-4xl text-ink leading-tight sm:text-5xl">Study Repository</h1>
      </header>

      <section className="mb-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-stone-mid pb-4">
          <div>
            <h2 className="font-display text-3xl text-ink font-medium">Field Manuals & Resources</h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">Documentation, Videos & Manuals</p>
          </div>
          
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search repository..." 
              className="w-full rounded-md border border-stone-deep bg-white py-2 pl-10 pr-4 text-[13.5px] font-ui transition-all focus:border-navy-soft focus:outline-none focus:ring-4 focus:ring-navy-wash sm:w-[260px]"
            />
          </div>
        </div>

        <div className="min-h-[300px]">
          {loading ? (
             <PageLoader text="Syncing Library..." className="min-h-[300px]" />
           ) : filteredMaterials.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.map(item => {
                const downloadLink = item.isB2 ? materialsApi.getDownloadUrl(item.id) : item.downloadUrl;
                const viewLink = item.isB2 ? materialsApi.getViewUrl(item.id) : (item.viewUrl || item.downloadUrl);
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => viewLink && window.open(viewLink, '_blank')}
                    className="group relative flex flex-col gap-6 rounded-xl border border-stone-deep bg-white p-6 transition-all hover:-translate-y-1 hover:border-navy-pale hover:shadow-[0_4px_16px_rgba(26,39,68,0.06)] cursor-pointer"
                  >
                     <div className="flex items-start justify-between">
                       <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm transition-colors ${
                         item.fileType === 'VIDEO' 
                           ? 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100' 
                           : 'bg-stone-wash text-navy group-hover:bg-navy-wash'
                       }`}>
                          {item.fileType === 'VIDEO' ? <Video size={24} strokeWidth={1.5} /> : <FileText size={24} strokeWidth={1.5} />}
                       </div>
                       
                       <div className="flex items-center gap-2">
                         {downloadLink && (
                           <a 
                              href={downloadLink} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-wash text-ink-3 transition-all hover:bg-navy hover:text-white"
                              title="Download Resource"
                            >
                              <Download size={18} />
                           </a>
                         )}
                       </div>
                     </div>
                     
                     <div className="flex flex-1 flex-col">
                        <h3 className="mb-2 font-display text-xl text-ink group-hover:text-navy transition-colors">{item.title}</h3>
                        {item.description && <p className="mb-4 line-clamp-2 font-ui text-[13.5px] text-ink-3 leading-relaxed">{item.description}</p>}
                        
                        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-stone-wash pt-4">
                           {item.subject && (
                             <span className="rounded-sm bg-stone-wash px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-3">
                               {item.subject}
                             </span>
                           )}
                           
                           <div className="flex items-center gap-1.5 font-mono text-[10px] text-ink-4 uppercase tracking-wider">
                             <span>{item.fileType}</span>
                             {item.sizeBytes && <span>· {formatBytes(item.sizeBytes)}</span>}
                           </div>
                           
                           {item.isDrive && (
                             <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase font-mono bg-amber-50 px-1.5 py-0.5 rounded">
                               <Globe size={10} /> Drive
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center text-center rounded-xl border border-dashed border-stone-deep bg-white/50">
               <div className="mb-4 rounded-full bg-stone-wash p-5 text-ink-4/40">
                 <BookOpen size={32} strokeWidth={1.5} />
               </div>
               <p className="font-display text-2xl text-ink font-medium">Repository Empty</p>
               <p className="mt-2 font-ui text-[14px] uppercase tracking-wider text-ink-4">No study materials found for this criteria.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default CadetMaterials;
