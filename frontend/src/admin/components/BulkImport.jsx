import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { 
  FileUp, 
  Download, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function BulkImport({ isOpen, onClose, onRefresh }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.type === 'text/csv' || selected.name.endsWith('.csv'))) {
      setFile(selected);
      setResult(null);
    } else {
      toast.error('Invalid file selection. Please provide a valid CSV file.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await adminApi.bulkImport(formData);
      setUploading(false);
      if (data) {
        setResult(data);
        if (data.count > 0) onRefresh();
      }
    } catch (error) {
      setUploading(false);
      toast.error(error.message || 'Failed to upload and process file');
    }
  };

  const downloadTemplate = () => {
    const headers = 'name,regimentalNumber,collegeCode,wing,batch,email\n';
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cadet_import_template.csv';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm">
      <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[600px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
        <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-stone-deep text-navy">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="m-0 text-[20px] text-navy font-semibold font-ui tracking-tight">Bulk Cadet <span className="text-gold-2">Import</span></h2>
              <p className="m-0 text-[12px] text-ink-4 font-ui">Enroll multiple cadets via CSV upload</p>
            </div>
          </div>
          <button className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-6">
          {!result ? (
            <div>
              <input 
                id="csv-upload"
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
              
              <label 
                htmlFor="csv-upload"
                className={`border-2 border-dashed border-stone-deep rounded-xl px-5 py-10 flex flex-col items-center cursor-pointer transition-all w-full focus-within:ring-2 focus-within:ring-navy-soft ${file ? 'bg-black/5 border-navy-soft' : 'bg-transparent hover:bg-stone'}`}
              >
                <FileUp size={48} strokeWidth={1} className={`mb-4 ${file ? 'text-navy opacity-100' : 'opacity-30'}`} />
                {file ? (
                  <div className="text-center">
                    <p className="font-semibold text-navy mb-1">{file.name}</p>
                    <p className="text-[11px] text-ink-4">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-medium text-ink-2">Click or drag CSV here</p>
                    <p className="text-[11px] text-ink-4 mt-1">Fields: name, regimentalNumber, collegeCode, wing, batch, email</p>
                  </div>
                )}
              </label>

              <div className="flex flex-wrap justify-between items-center mt-6 gap-4">
                <button className="h-[40px] px-4 rounded-md font-ui text-[12px] font-medium flex items-center justify-center gap-2 bg-transparent text-ink-3 hover:bg-stone transition-colors" onClick={downloadTemplate}>
                  <Download size={14} />
                  <span>Template</span>
                </button>
                
                <button 
                  className="flex-1 min-w-[150px] h-[40px] rounded-md font-ui text-[14px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={!file || uploading}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <><Loader2 className="animate-spin" size={16} /> Processing...</>
                  ) : (
                    <>Start Import</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className={`flex gap-4 items-center mb-6 p-4 rounded-xl border ${result.errors && result.errors.length > 0 ? 'bg-[#C9982A]/10 border-gold-2' : 'bg-[#556B2F]/10 border-olive-soft'}`}>
                {result.errors && result.errors.length > 0 ? <AlertCircle className="text-gold-3" /> : <CheckCircle2 className="text-olive" />}
                <div>
                  <h4 className="m-0 text-[15px] text-ink font-semibold">Import Processed</h4>
                  <p className="m-0 mt-1 text-[13px] text-ink-3">
                    Successfully created <strong>{result.count}</strong> cadets.
                  </p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-5">
                  <h5 className="font-mono text-[10px] uppercase text-ink-4 mb-3">Error Details</h5>
                  <div className="max-h-[200px] overflow-y-auto flex flex-col gap-2 pr-1">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="text-[12px] px-3 py-2.5 bg-stone rounded-md flex gap-3">
                        <span className="font-semibold text-navy/60 shrink-0">Row {err.row}</span>
                        <span className="text-crimson font-medium break-words">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="w-full h-[40px] mt-8 rounded-md font-ui text-[14px] font-medium flex items-center justify-center bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all" onClick={onClose}>
                Return to Registry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
