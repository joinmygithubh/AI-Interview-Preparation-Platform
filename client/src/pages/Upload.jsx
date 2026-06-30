import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, Loader2, Play } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../services/api';
import ResumeCard from '../components/ResumeCard';
import SessionConfigModal from '../components/SessionConfigModal';

const ACCEPTED_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'DOCX',
};
const MAX_SIZE = 5 * 1024 * 1024;

const UploadPage = () => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resume, setResume] = useState(null);
  const [summary, setSummary] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const validateFile = (file) => {
    if (!file) return false;
    if (!ACCEPTED_TYPES[file.type]) {
      toast.error('Only PDF and DOCX files are accepted');
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast.error('File exceeds the 5MB limit');
      return false;
    }
    return true;
  };

  const uploadFile = async (file) => {
    if (!validateFile(file)) return;

    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    setProgress(0);
    setResume(null);

    try {
      const { data } = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      });

      setResume(data.data.resume);
      setSummary(data.data.summary || '');
      toast.success('Resume parsed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    uploadFile(file);
  };

  const handleSelect = (e) => {
    const file = e.target.files?.[0];
    uploadFile(file);
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Upload your resume
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          We&apos;ll parse it and tailor your mock interview. PDF or DOCX, up to
          5MB.
        </p>
      </div>

      {/* Drag-and-drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
            : 'border-slate-300 dark:border-slate-600 bg-surface-light dark:bg-slate-800'
        }`}
      >
        <UploadCloud className="h-10 w-10 text-brand-500" />
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-200">
            Drag &amp; drop your resume here
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            or click to browse
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleSelect}
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div>
          <div className="mb-1 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading &amp;
              parsing...
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <motion.div
              className="h-full rounded-full bg-brand-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Parsed result */}
      {resume && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <FileText className="h-4 w-4" />
            {resume.originalName}
          </div>

          <ResumeCard resume={resume} summary={summary} />

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 shadow-lg shadow-brand-500/20 px-4 py-3 font-medium text-white transition hover:from-brand-700 hover:to-brand-600"
          >
            <Play className="h-4 w-4" /> Start interview
          </button>
        </div>
      )}

      <SessionConfigModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        resumeId={resume?._id}
      />
    </div>
  );
};

export default UploadPage;
