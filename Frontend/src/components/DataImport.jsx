import { useRef, useState } from 'react';
import { FolderOpen, Upload } from 'lucide-react';
import { apiRequest } from '../api';

export default function DataImport() {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const importFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setStatus('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const result = await apiRequest('/api/exams/upload-zip', { method: 'POST', body: formData });
      window.dispatchEvent(new CustomEvent('examease:data-imported', { detail: result }));
      setStatus(`Imported ${result.imported || 0} student records.`);
    } catch (error) {
      setStatus(error.message || 'Unable to import the selected files.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
        <Upload size={16} />
        <span>{uploading ? 'Importing...' : 'Import File / ZIP'}</span>
      </button>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.docx,.zip" multiple className="hidden" onChange={importFiles} />
      <button type="button" onClick={() => folderInputRef.current?.click()} disabled={uploading} className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-60">
        <FolderOpen size={16} />
        <span>Import Folder</span>
      </button>
      <input ref={folderInputRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={importFiles} />
      {status && <span className="hidden xl:inline text-xs text-slate-500 max-w-56 truncate" title={status}>{status}</span>}
    </div>
  );
}
