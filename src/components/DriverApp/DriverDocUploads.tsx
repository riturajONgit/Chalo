import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Check, 
  FileCheck,
  ShieldCheck
} from 'lucide-react';

export type DocType = 'rc' | 'permit' | 'insurance' | 'dl';

export interface DocItemConfig {
  type: DocType;
  title: string;
  description: string;
}

export const DOC_CONFIGS: DocItemConfig[] = [
  { type: 'rc', title: 'RC', description: 'Vehicle Registration Certificate' },
  { type: 'permit', title: 'Permit', description: 'Commercial / State Transport Permit' },
  { type: 'insurance', title: 'Insurance', description: 'Valid Vehicle Insurance Policy' },
  { type: 'dl', title: 'Driving Licence', description: 'Driver Commercial / Transport DL' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export const validateDocFile = (file: File): string | null => {
  const extension = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const isValidType = 
    ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || 
    ALLOWED_EXTENSIONS.includes(extension);

  if (!isValidType) {
    return 'Invalid file type. Only PDF, JPG, and PNG files are accepted.';
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return `File size (${sizeInMb} MB) exceeds the 5 MB limit. Please choose a smaller file.`;
  }

  return null;
};

interface DriverDocUploadsProps {
  status: string; // 'pending' | 'suspended' | 'approved'
  userId?: string;
  onDocUploaded?: (docType: DocType, path: string) => void;
  onUploadCountChange?: (count: number) => void;
}

export const DriverDocUploads: React.FC<DriverDocUploadsProps> = ({
  status,
  userId: propUserId,
  onDocUploaded,
  onUploadCountChange,
}) => {
  const isApproved = status.toLowerCase() === 'approved';
  const isSuspended = status.toLowerCase() === 'suspended';
  const isPending = status.toLowerCase() === 'pending';

  // If approved or suspended, do not show document uploads
  if (isApproved || isSuspended) {
    return null;
  }

  const [currentUserId, setCurrentUserId] = useState<string | null>(propUserId || null);
  const [docsState, setDocsState] = useState<Record<DocType, { isUploaded: boolean; fileName?: string; path?: string }>>({
    rc: { isUploaded: false },
    permit: { isUploaded: false },
    insurance: { isUploaded: false },
    dl: { isUploaded: false },
  });

  const [uploadingDoc, setUploadingDoc] = useState<DocType | null>(null);
  const [docErrors, setDocErrors] = useState<Partial<Record<DocType, string>>>({});
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Hidden file input refs for each card
  const fileInputRefs = {
    rc: useRef<HTMLInputElement>(null),
    permit: useRef<HTMLInputElement>(null),
    insurance: useRef<HTMLInputElement>(null),
    dl: useRef<HTMLInputElement>(null),
  };

  // Sync state with storage and local cache
  const loadUploadedDocs = useCallback(async (uid: string) => {
    setIsLoadingDocs(true);
    setGlobalError(null);

    // 1. Check local cache first for instant UI response
    const cacheKey = `chalo_driver_docs_${uid}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setDocsState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore localStorage errors
    }

    try {
      // 2. Query driver-docs storage bucket for the user's files
      const { data: files, error } = await supabase.storage.from('driver-docs').list(uid);

      if (error) {
        // If bucket or folder query fails, don't break the whole screen, just log
        console.warn('Storage list notice:', error.message);
      } else if (files && Array.isArray(files)) {
        const updated: Record<DocType, { isUploaded: boolean; fileName?: string; path?: string }> = {
          rc: { isUploaded: false },
          permit: { isUploaded: false },
          insurance: { isUploaded: false },
          dl: { isUploaded: false },
        };

        // Determine which docs exist by prefix in filename
        (Object.keys(updated) as DocType[]).forEach((type) => {
          const matchingFiles = files.filter((f) => f.name.startsWith(`${type}-`));
          if (matchingFiles.length > 0) {
            // Sort by latest created/modified
            matchingFiles.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            const latest = matchingFiles[0];
            updated[type] = {
              isUploaded: true,
              fileName: latest.name,
              path: `${uid}/${latest.name}`,
            };
          }
        });

        setDocsState((prev) => {
          const merged = { ...prev };
          (Object.keys(updated) as DocType[]).forEach((type) => {
            if (updated[type].isUploaded) {
              merged[type] = updated[type];
            }
          });
          try {
            localStorage.setItem(cacheKey, JSON.stringify(merged));
          } catch {
            // Ignore
          }
          return merged;
        });
      }
    } catch (err: any) {
      console.warn('Error loading driver documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // Initialize and get current user id
  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          setCurrentUserId(user.id);
          await loadUploadedDocs(user.id);
        } else if (isMounted) {
          setIsLoadingDocs(false);
        }
      } catch (err) {
        console.warn('Get user notice:', err);
        if (isMounted) setIsLoadingDocs(false);
      }
    };

    if (propUserId) {
      setCurrentUserId(propUserId);
      loadUploadedDocs(propUserId);
    } else {
      fetchUser();
    }

    return () => {
      isMounted = false;
    };
  }, [propUserId, loadUploadedDocs]);

  // Handle file selection and upload
  const handleFileChange = async (docType: DocType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset file input value so re-selecting the same file fires onChange
    e.target.value = '';

    if (!file) return;

    // Clear previous error for this card
    setDocErrors((prev) => ({ ...prev, [docType]: undefined }));
    setGlobalError(null);

    // 1. Validate file type and size (< 5 MB)
    const validationError = validateDocFile(file);
    if (validationError) {
      setDocErrors((prev) => ({ ...prev, [docType]: validationError }));
      return;
    }

    // 2. Ensure authenticated user
    let uid = currentUserId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDocErrors((prev) => ({ ...prev, [docType]: 'Please sign in to upload documents.' }));
        return;
      }
      uid = user.id;
      setCurrentUserId(uid);
    }

    setUploadingDoc(docType);

    try {
      // 3. Upload to supabase.storage.from('driver-docs')
      // Path format: `${user.id}/${docType}-${Date.now()}-${file.name}`
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uploadPath = `${uid}/${docType}-${Date.now()}-${sanitizedName}`;

      const { error: storageError } = await supabase.storage
        .from('driver-docs')
        .upload(uploadPath, file, { upsert: true });

      if (storageError) {
        throw new Error(storageError.message || 'File upload to storage failed.');
      }

      // 4. Call supabase.rpc('set_driver_document', { p_doc_type, p_path })
      const { error: rpcError } = await supabase.rpc('set_driver_document', {
        p_doc_type: docType,
        p_path: uploadPath,
      });

      if (rpcError) {
        throw new Error(rpcError.message || `Failed to register ${docType.toUpperCase()} document.`);
      }

      // 5. Update local state & cache
      const updatedEntry = {
        isUploaded: true,
        fileName: file.name,
        path: uploadPath,
      };

      setDocsState((prev) => {
        const next = { ...prev, [docType]: updatedEntry };
        try {
          localStorage.setItem(`chalo_driver_docs_${uid}`, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });

      if (onDocUploaded) {
        onDocUploaded(docType, uploadPath);
      }
    } catch (err: any) {
      console.warn(`Error uploading ${docType}:`, err);
      const errorMsg = err?.message || 'Upload failed. Please try again.';
      setDocErrors((prev) => ({ ...prev, [docType]: errorMsg }));
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleCardClick = (docType: DocType) => {
    if (uploadingDoc) return;
    fileInputRefs[docType].current?.click();
  };

  // Calculate uploaded count
  const uploadedCount = (Object.keys(docsState) as DocType[]).filter(
    (key) => docsState[key]?.isUploaded
  ).length;

  // Notify parent of uploaded count changes
  useEffect(() => {
    if (onUploadCountChange) {
      onUploadCountChange(uploadedCount);
    }
  }, [uploadedCount, onUploadCountChange]);

  const progressPercentage = Math.round((uploadedCount / 4) * 100);

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 animate-in fade-in">
      {/* Header & Instructions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#F59E0B] shrink-0" />
            <h3 className="text-[20px] font-bold tracking-tight text-white">Driver Documents</h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-2.5 py-1 rounded-full">
            {uploadedCount} of 4 uploaded
          </span>
        </div>

        {/* Banner based on uploaded count */}
        {uploadedCount < 4 ? (
          <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#F59E0B]/30 space-y-2">
            <p className="text-xs text-amber-200 font-medium leading-relaxed">
              Upload all four documents. We review them before activating your account.
            </p>
            {/* Progress bar */}
            <div className="w-full bg-[#262626] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#F59E0B] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#A3A3A3]">
              <span>PDF, JPG, PNG up to 5 MB</span>
              <span className="font-semibold text-[#F59E0B]">{progressPercentage}% Complete</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All documents received. We will review them shortly.</span>
            </div>
            <div className="w-full bg-[#262626] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: '100%' }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-emerald-400/80">
              <span>Ready for verification</span>
              <span className="font-semibold text-emerald-300">100% Complete</span>
            </div>
          </div>
        )}
      </div>

      {globalError && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-[#EF4444]/40 text-red-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Four Upload Cards: RC, Permit, Insurance, Driving Licence - visible with Replace until approval */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {DOC_CONFIGS.map((config) => {
          const doc = docsState[config.type];
          const isUploaded = Boolean(doc?.isUploaded);
          const isUploading = uploadingDoc === config.type;
          const cardError = docErrors[config.type];

          return (
            <div
              key={config.type}
              className={`rounded-xl p-3.5 border transition-all ${
                isUploaded
                  ? 'bg-[#0A0A0A] border-emerald-500/40'
                  : 'bg-[#0A0A0A] border-[#262626] hover:border-white/20'
              }`}
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRefs[config.type]}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => handleFileChange(config.type, e)}
              />

              <div className="space-y-2.5">
                {/* Title & Status Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{config.title}</span>
                      {isUploaded && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </h4>
                    <p className="text-[11px] text-[#A3A3A3] mt-0.5">
                      {config.description}
                    </p>
                  </div>

                  {/* Status Badge */}
                  {isUploaded ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Uploaded ✓</span>
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-[#A3A3A3] px-2 py-0.5 rounded bg-white/5 border border-white/10 shrink-0">
                      Missing
                    </span>
                  )}
                </div>

                {/* Card Error if file larger, wrong type, or RPC fails */}
                {cardError && (
                  <div className="p-2.5 rounded-lg bg-red-950/40 border border-[#EF4444]/40 text-red-200 text-[11px] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0 mt-0.5" />
                    <span className="leading-tight">{cardError}</span>
                  </div>
                )}

                {/* Actions: "Upload" if empty, or "Uploaded ✓" with Replace button if set */}
                <div className="pt-1">
                  {isUploading ? (
                    <div className="w-full min-h-[42px] rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
                      <span>Uploading to verification...</span>
                    </div>
                  ) : isUploaded ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCardClick(config.type)}
                        className="flex-1 min-h-[42px] rounded-xl bg-transparent hover:bg-white/5 border border-white/20 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#A3A3A3]" />
                        <span>Replace</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCardClick(config.type)}
                      className="w-full min-h-[42px] rounded-xl bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Upload</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    );
  };
