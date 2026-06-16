import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { adminApi } from '../../api';
import { invalidateCachedResource } from '../../lib/resourceCache';
import { 
  FileUp, 
  Download, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';

const validateRow = (row, colleges, batches) => {
  const errors = {};
  
  // Extract values, trim and match fields (support varying header cases)
  const name = (row.name || row.Name || row.NAME || '').trim();
  const regNo = (row.regimentalNumber || row.RegimentalNumber || row.regNo || row.RegNo || '').trim();
  const collegeCode = (row.collegeCode || row.CollegeCode || row.college || row.College || '').trim().toUpperCase();
  const wing = (row.wing || row.Wing || row.WING || '').trim().toUpperCase();
  const batch = (row.batch || row.Batch || row.BATCH || '').trim();
  const email = (row.email || row.Email || row.EMAIL || '').trim();

  // Name validation
  if (!name) {
    errors.name = "Name is required";
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  // Regimental Number validation
  if (!regNo) {
    errors.regimentalNumber = "Regimental number is required";
  } else if (regNo.length < 5) {
    errors.regimentalNumber = "Regimental number must be at least 5 characters";
  }

  // College Code validation
  if (!collegeCode) {
    errors.collegeCode = "College code is required";
  } else {
    const exists = colleges.some(c => c.code.toUpperCase() === collegeCode);
    if (!exists) {
      errors.collegeCode = `Invalid College Code: "${collegeCode}"`;
    }
  }

  // Wing validation
  if (wing && !["ARMY", "NAVY", "AIR"].includes(wing)) {
    errors.wing = "Wing must be ARMY, NAVY, or AIR";
  }

  // Batch validation
  if (batch) {
    const exists = batches.some(b => b.name === batch);
    if (!exists) {
      errors.batch = `Invalid Batch: "${batch}"`;
    }
  }

  // Email validation
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = "Invalid email format";
    }
  }

  return {
    data: {
      name,
      regimentalNumber: regNo,
      collegeCode,
      wing: wing || null,
      batch: batch || null,
      email: email || null
    },
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

export default function BulkImport({ isOpen, onClose, onRefresh }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [collegesList, setCollegesList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);
  
  // Validation States
  const [parsedRows, setParsedRows] = useState([]);
  const [validationStats, setValidationStats] = useState({ total: 0, valid: 0, invalid: 0 });
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  
  // Pagination & Filtering States
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'valid' | 'error'
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      adminApi.getColleges()
        .then(res => {
          setCollegesList(res.data?.colleges || []);
        })
        .catch(err => console.error("Failed to load colleges", err));

      adminApi.getBatches()
        .then(res => {
          setBatchesList(res.data || []);
        })
        .catch(err => console.error("Failed to load batches", err));
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const startChunkedValidation = (rawData, colleges, batches) => {
    setIsValidating(true);
    setValidationProgress(0);
    setParsedRows([]);
    setResult(null);

    const chunkSize = 250; // Perform validations in chunks of 250 rows to keep main thread responsive
    const totalRows = rawData.length;
    let index = 0;
    const resultsAccumulator = [];

    const processNextChunk = () => {
      const chunkEnd = Math.min(index + chunkSize, totalRows);
      
      for (let i = index; i < chunkEnd; i++) {
        const validatedRow = validateRow(rawData[i], colleges, batches);
        resultsAccumulator.push(validatedRow);
      }

      index = chunkEnd;
      const progressPercent = Math.round((index / totalRows) * 100);
      setValidationProgress(progressPercent);

      if (index < totalRows) {
        // Yield execution back to the browser before starting the next batch
        setTimeout(processNextChunk, 0);
      } else {
        // Validation Completed
        setParsedRows(resultsAccumulator);
        const total = resultsAccumulator.length;
        const valid = resultsAccumulator.filter(r => r.isValid).length;
        const invalid = total - valid;
        setValidationStats({ total, valid, invalid });
        setIsValidating(false);
        setSkipInvalid(invalid > 0);
        setCurrentPage(1);
        setActiveTab(invalid > 0 ? 'error' : 'all'); // Autofocus errors tab if errors exist
      }
    };

    // Begin chunk processing
    processNextChunk();
  };

  // Re-run validation if reference list loads after the file is parsed
  useEffect(() => {
    if (file && collegesList.length > 0 && !isValidating && parsedRows.length === 0) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          startChunkedValidation(results.data, collegesList, batchesList);
        },
        error: (err) => {
          toast.error("Failed to parse CSV file: " + err.message);
        }
      });
    }
  }, [collegesList, batchesList, file]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.type === 'text/csv' || selected.name.endsWith('.csv'))) {
      setFile(selected);
      setResult(null);
      
      Papa.parse(selected, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          startChunkedValidation(results.data, collegesList, batchesList);
        },
        error: (err) => {
          toast.error("Failed to parse CSV file: " + err.message);
        }
      });
    } else {
      toast.error('Invalid file selection. Please provide a valid CSV file.');
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedRows([]);
    setValidationStats({ total: 0, valid: 0, invalid: 0 });
    setSkipInvalid(false);
    setResult(null);
    setIsValidating(false);
    setValidationProgress(0);
    setActiveTab('all');
    setCurrentPage(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleUpload = async () => {
    if (!file || parsedRows.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    // Filter valid rows if skipInvalid is checked
    const rowsToUpload = skipInvalid 
      ? parsedRows.filter(r => r.isValid).map(r => r.data)
      : parsedRows.map(r => r.data);

    if (rowsToUpload.length === 0) {
      toast.error('No valid rows to import.');
      setUploading(false);
      return;
    }

    // Convert back to CSV string for uploading
    const csvString = Papa.unparse(rowsToUpload);
    const csvBlob = new Blob([csvString], { type: 'text/csv' });
    
    // Modify filename to indicate it's validated
    const uploadFilename = skipInvalid ? `validated_${file.name}` : file.name;
    formData.append('file', csvBlob, uploadFilename);

    try {
      const { data } = await adminApi.bulkImport(formData);
      setUploading(false);
      if (data) {
        setResult(data);
        if (data.count > 0) {
          invalidateCachedResource('admin-users-students');
          onRefresh?.();
        }
      }
    } catch (error) {
      setUploading(false);
      toast.error(error.message || 'Failed to upload and process file');
    }
  };

  const downloadTemplate = () => {
    const headers = 'name,regimentalNumber,collegeCode,wing,batch,email\n';
    
    // Use active database records to generate highly accurate and correct template drop-ins
    const sampleCollege = collegesList.length > 0 ? collegesList[0].code : 'COL001';
    const sampleBatch = batchesList.length > 0 ? batchesList[0].name : 'Batch-2026';
    
    const row1 = `John Doe,AP26SDA100101,${sampleCollege},ARMY,${sampleBatch},john.doe@example.com\n`;
    const row2 = `Jane Smith,AP26SWN200202,${sampleCollege},NAVY,${sampleBatch},jane.smith@example.com\n`;
    const row3 = `Bob Johnson,AP26SDA300303,${sampleCollege},AIR,${sampleBatch},bob.johnson@example.com\n`;
    
    const blob = new Blob([headers + row1 + row2 + row3], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cadet_import_template.csv';
    a.click();
  };

  // Filter preview rows based on active Tab selection
  const filteredRows = parsedRows.filter(row => {
    if (activeTab === 'valid') return row.isValid;
    if (activeTab === 'error') return !row.isValid;
    return true;
  });

  const totalFilteredRows = filteredRows.length;
  const totalPages = Math.ceil(totalFilteredRows / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const visibleRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm">
      <div 
        className={`bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-h-[90vh] flex flex-col transition-all duration-300 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] ${file ? 'max-w-[850px]' : 'max-w-[600px]'}`}
      >
        {/* Sticky Header */}
        <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-stone-deep text-navy">
              <FileSpreadsheet size={20} />
            </div>
            <div className="text-left">
              <h2 className="m-0 text-[20px] text-navy font-semibold font-ui tracking-tight">Bulk Cadet <span className="text-gold-2">Import</span></h2>
              <p className="m-0 text-[12px] text-ink-4 font-ui">Enroll multiple cadets via CSV upload</p>
            </div>
          </div>
          <button className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors cursor-pointer" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto flex-grow p-6">
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
              
              {!file ? (
                <label 
                  htmlFor="csv-upload"
                  className="border-2 border-dashed border-stone-deep rounded-xl px-5 py-10 flex flex-col items-center cursor-pointer transition-all w-full bg-transparent hover:bg-stone focus-within:ring-2 focus-within:ring-navy-soft"
                >
                  <FileUp size={48} strokeWidth={1} className="mb-4 opacity-30 text-navy" />
                  <div className="text-center">
                    <p className="font-medium text-ink-2">Click or drag CSV here</p>
                    <p className="text-[11px] text-ink-4 mt-1">Fields: name, regimentalNumber, collegeCode, wing, batch, email</p>
                  </div>
                </label>
              ) : (
                <div>
                  {/* File Metadata info */}
                  <div className="flex justify-between items-center bg-stone-wash border border-stone-deep rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-navy-wash rounded-lg text-navy">
                        <FileSpreadsheet size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-navy text-[14px] leading-tight">{file.name}</p>
                        <p className="text-[11px] text-ink-4">{(file.size / 1024).toFixed(2)} KB • {validationStats.total} rows</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleClear}
                      className="p-2 text-ink-4 hover:text-crimson hover:bg-crimson-wash rounded-lg transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {isValidating ? (
                    /* High-performance Progress Indicator for Large Files */
                    <div className="border border-stone-deep rounded-xl p-8 flex flex-col items-center justify-center bg-white min-h-[220px] mb-4">
                      <Loader2 className="animate-spin text-navy mb-3" size={32} />
                      <p className="font-semibold text-navy text-[14px]">Validating Cadet Records...</p>
                      <div className="w-full max-w-[300px] bg-stone rounded-full h-2 mt-4 overflow-hidden border border-stone-deep">
                        <div 
                          className="bg-navy h-full transition-all duration-300 rounded-full" 
                          style={{ width: `${validationProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-ink-4 mt-2 font-mono">{validationProgress}% Complete</p>
                    </div>
                  ) : (
                    <div>
                      {/* Validation Stats Banner */}
                      {validationStats.invalid > 0 ? (
                        <div className="mb-4 p-3.5 rounded-xl border flex items-center justify-between text-[13px] bg-gold-wash border-gold-pale text-ink">
                          <div className="flex items-center gap-2.5">
                            <AlertCircle className="text-gold animate-pulse" size={18} />
                            <div className="text-left">
                              <span className="font-semibold">{validationStats.invalid} rows have validation errors</span>.
                              <span className="block text-[11px] text-ink-3">Click on the tabs below to view and skip invalid rows.</span>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer bg-white border border-stone-deep rounded-md px-2.5 py-1 text-[12px] font-semibold text-navy hover:bg-stone transition-all">
                            <input 
                              type="checkbox" 
                              checked={skipInvalid} 
                              onChange={(e) => setSkipInvalid(e.target.checked)}
                              className="accent-navy"
                            />
                            <span>Skip invalid rows</span>
                          </label>
                        </div>
                      ) : (
                        <div className="mb-4 p-3.5 rounded-xl border flex items-center gap-2.5 text-[13px] bg-olive-wash border-olive-pale text-ink text-left">
                          <CheckCircle2 className="text-olive" size={18} />
                          <div>
                            <span className="font-semibold">All {validationStats.total} rows are valid!</span> Ready to import.
                          </div>
                        </div>
                      )}

                      {/* Status Tabs for Filtering Grid */}
                      <div className="flex border-b border-stone-deep mb-3.5 gap-2 text-[12px]">
                        <button
                          onClick={() => handleTabChange('all')}
                          className={`px-3 py-1.5 font-semibold transition-all border-b-2 -mb-[2px] cursor-pointer ${
                            activeTab === 'all' 
                              ? 'border-navy text-navy font-bold' 
                              : 'border-transparent text-ink-4 hover:text-ink-2'
                          }`}
                        >
                          All Rows ({validationStats.total})
                        </button>
                        <button
                          onClick={() => handleTabChange('valid')}
                          className={`px-3 py-1.5 font-semibold transition-all border-b-2 -mb-[2px] cursor-pointer ${
                            activeTab === 'valid' 
                              ? 'border-olive text-olive font-bold' 
                              : 'border-transparent text-ink-4 hover:text-ink-2'
                          }`}
                        >
                          Valid ({validationStats.valid})
                        </button>
                        <button
                          onClick={() => handleTabChange('error')}
                          className={`px-3 py-1.5 font-semibold transition-all border-b-2 -mb-[2px] cursor-pointer ${
                            activeTab === 'error' 
                              ? 'border-crimson text-crimson font-bold' 
                              : 'border-transparent text-ink-4 hover:text-ink-2'
                          }`}
                        >
                          Errors ({validationStats.invalid})
                        </button>
                      </div>

                      {/* Interactive Preview Grid */}
                      <div className="border border-stone-deep rounded-xl overflow-hidden mb-5 bg-white">
                        <div className="max-h-[240px] overflow-y-auto overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[12px]">
                            <thead>
                              <tr className="bg-stone border-b border-stone-deep font-semibold text-navy sticky top-0 z-10">
                                <th className="p-2.5">Status</th>
                                <th className="p-2.5">Name</th>
                                <th className="p-2.5">Regimental No.</th>
                                <th className="p-2.5">College Code</th>
                                <th className="p-2.5">Wing</th>
                                <th className="p-2.5">Batch</th>
                                <th className="p-2.5">Email</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleRows.length > 0 ? (
                                visibleRows.map((row, idx) => (
                                  <tr key={idx} className="border-b border-stone border-stone-wash hover:bg-stone-wash transition-colors">
                                    <td className="p-2.5 font-medium">
                                      {row.isValid ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-olive bg-olive-wash px-2 py-0.5 rounded-full">
                                          <CheckCircle2 size={10} /> Valid
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-crimson bg-crimson-wash px-2 py-0.5 rounded-full">
                                          <AlertCircle size={10} /> Error
                                        </span>
                                      )}
                                    </td>
                                    <td className={`p-2.5 font-mono ${row.errors.name ? 'bg-crimson-wash/40 font-semibold' : ''}`}>
                                      <div className="flex items-center justify-between gap-1" title={row.errors.name}>
                                        <span className={row.errors.name ? 'text-crimson' : ''}>{row.data.name || <span className="text-ink-4 italic">missing</span>}</span>
                                        {row.errors.name && <AlertCircle size={12} className="text-crimson shrink-0" />}
                                      </div>
                                    </td>
                                    <td className={`p-2.5 font-mono ${row.errors.regimentalNumber ? 'bg-crimson-wash/40 font-semibold' : ''}`}>
                                      <div className="flex items-center justify-between gap-1" title={row.errors.regimentalNumber}>
                                        <span className={row.errors.regimentalNumber ? 'text-crimson' : ''}>{row.data.regimentalNumber || <span className="text-ink-4 italic">missing</span>}</span>
                                        {row.errors.regimentalNumber && <AlertCircle size={12} className="text-crimson shrink-0" />}
                                      </div>
                                    </td>
                                    <td className={`p-2.5 font-mono ${row.errors.collegeCode ? 'bg-crimson-wash/40 font-semibold' : ''}`}>
                                      <div className="flex items-center justify-between gap-1" title={row.errors.collegeCode}>
                                        <span className={row.errors.collegeCode ? 'text-crimson' : ''}>{row.data.collegeCode || <span className="text-ink-4 italic">missing</span>}</span>
                                        {row.errors.collegeCode && <AlertCircle size={12} className="text-crimson shrink-0" />}
                                      </div>
                                    </td>
                                    <td className={`p-2.5 font-mono ${row.errors.wing ? 'bg-crimson-wash/40 font-semibold' : ''}`}>
                                      <div className="flex items-center justify-between gap-1" title={row.errors.wing}>
                                        <span className={row.errors.wing ? 'text-crimson' : ''}>{row.data.wing || <span className="text-ink-4 italic">none</span>}</span>
                                        {row.errors.wing && <AlertCircle size={12} className="text-crimson shrink-0" />}
                                      </div>
                                    </td>
                                    <td className={`p-2.5 font-mono ${row.errors.batch ? 'bg-crimson-wash/40 font-semibold' : ''}`}>
                                      <div className="flex items-center justify-between gap-1" title={row.errors.batch}>
                                        <span className={row.errors.batch ? 'text-crimson' : ''}>{row.data.batch || <span className="text-ink-4 italic">none</span>}</span>
                                        {row.errors.batch && <AlertCircle size={12} className="text-crimson shrink-0" />}
                                      </div>
                                    </td>
                                    <td className={`p-2.5 font-mono ${row.errors.email ? 'bg-crimson-wash/40 font-semibold' : ''}`}>
                                      <div className="flex items-center justify-between gap-1" title={row.errors.email}>
                                        <span className={row.errors.email ? 'text-crimson' : ''}>{row.data.email || <span className="text-ink-4 italic">none</span>}</span>
                                        {row.errors.email && <AlertCircle size={12} className="text-crimson shrink-0" />}
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-ink-4 italic bg-stone-wash">
                                    No rows found matching current tab criteria.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-between items-center bg-stone border-t border-stone-deep px-4 py-2 text-[11px] text-ink-3">
                            <span className="font-medium">
                              Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalFilteredRows)} of {totalFilteredRows} rows
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-2 py-1 bg-white border border-stone-deep rounded hover:bg-stone-wash disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-navy cursor-pointer"
                              >
                                Previous
                              </button>
                              <span className="px-2 py-1 font-semibold text-navy">
                                Page {currentPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1 bg-white border border-stone-deep rounded hover:bg-stone-wash disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-navy cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reference Data Options Helper */}
              <div className="mt-5 p-4 rounded-xl border border-stone-deep bg-stone-wash text-ink text-left">
                <h4 className="font-mono text-[10px] uppercase font-bold tracking-wider text-ink-3 mb-2.5">
                  Import Reference Data Options (Dynamic database options)
                </h4>
                <div className="grid grid-cols-3 gap-3 text-[11px] leading-relaxed">
                  <div>
                    <span className="block font-semibold text-navy mb-1">Wings (wing)</span>
                    <div className="font-mono bg-white px-2 py-1.5 rounded border border-stone-deep max-h-[80px] overflow-y-auto">
                      <div>ARMY</div>
                      <div>NAVY</div>
                      <div>AIR</div>
                    </div>
                  </div>
                  <div>
                    <span className="block font-semibold text-navy mb-1">Colleges (collegeCode)</span>
                    <div className="font-mono bg-white px-2 py-1.5 rounded border border-stone-deep max-h-[80px] overflow-y-auto font-sans text-[10px]">
                      {collegesList.length > 0 ? (
                        collegesList.map(c => <div key={c.id || c.code} title={c.name} className="truncate">{c.code} - {c.name}</div>)
                      ) : (
                        <div className="text-ink-4">No colleges found</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="block font-semibold text-navy mb-1">Batches (batch)</span>
                    <div className="font-mono bg-white px-2 py-1.5 rounded border border-stone-deep max-h-[80px] overflow-y-auto font-sans">
                      {batchesList.length > 0 ? (
                        batchesList.map(b => <div key={b.id}>{b.name}</div>)
                      ) : (
                        <div className="text-ink-4">No active batches</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-left">
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
                  <h5 className="font-mono text-[10px] uppercase text-ink-4 mb-3">Database Integrity Issues (Skipped rows)</h5>
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
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="bg-stone border-t border-stone-mid px-6 py-4 flex-shrink-0">
          {!result ? (
            <div className="flex flex-wrap justify-between items-center gap-4">
              <button 
                className="h-[40px] px-4 rounded-md font-ui text-[12px] font-medium flex items-center justify-center gap-2 bg-transparent text-ink-3 hover:bg-stone-mid hover:text-ink-1 transition-colors cursor-pointer border border-stone-deep" 
                onClick={downloadTemplate}
              >
                <Download size={14} />
                <span>Download Template</span>
              </button>
              
              <button 
                className="flex-grow sm:flex-initial min-w-[150px] h-[40px] rounded-md font-ui text-[14px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" 
                disabled={!file || uploading || isValidating || (!skipInvalid && validationStats.invalid > 0)}
                onClick={handleUpload}
              >
                {uploading ? (
                  <><Loader2 className="animate-spin" size={16} /> Processing...</>
                ) : (
                  <>Start Import ({file ? (skipInvalid ? validationStats.valid : validationStats.total) : 0} Rows)</>
                )}
              </button>
            </div>
          ) : (
            <button 
              className="w-full h-[40px] rounded-md font-ui text-[14px] font-medium flex items-center justify-center bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all cursor-pointer" 
              onClick={onClose}
            >
              Finish & Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
