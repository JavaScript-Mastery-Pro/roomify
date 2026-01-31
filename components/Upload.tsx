import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle2, ArrowUp, Image as ImageIcon } from 'lucide-react';

const Upload: React.FC<UploadProps> = ({ onComplete, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [base64Data, setBase64Data] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setProgress(0);

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBase64Data(result);
      
      // Simulate analysis progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 15; // Faster progress
        });
      }, 100);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Auto-advance when complete
  useEffect(() => {
    if (progress === 100 && base64Data) {
      const timeout = setTimeout(() => {
        onComplete(base64Data);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [progress, base64Data, onComplete]);

  return (
    <div className={`w-full ${className}`}>
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative h-48 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group bg-zinc-50
              ${isDragging ? 'border-primary bg-orange-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'}
            `}
          >
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png"
            />
            
            <div className="flex flex-col items-center pointer-events-none">
                <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors
                    ${isDragging ? 'bg-orange-100 text-primary' : 'bg-zinc-200 text-zinc-500 group-hover:bg-zinc-300 group-hover:text-black'}
                `}>
                    <UploadIcon size={20} />
                </div>
                <p className="text-zinc-900 font-bold text-sm mb-1">Click to upload or drag and drop</p>
                <p className="text-zinc-500 text-xs">Maximum file size 50 MB.</p>
            </div>
          </div>
        ) : (
          <div className="h-48 rounded-xl border border-zinc-200 bg-white p-6 flex flex-col justify-center relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
               <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center text-black mb-3 border border-zinc-200">
                   {progress === 100 ? <CheckCircle2 className="text-green-500" /> : <ImageIcon />}
               </div>
               
               <h3 className="text-black font-bold text-sm truncate max-w-full px-4">{file.name}</h3>
               
               <div className="w-full max-w-[200px] h-1.5 bg-zinc-100 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
               </div>
               
               <p className="text-zinc-500 text-xs font-mono uppercase mt-2">
                   {progress < 100 ? 'Analyzing Floor Plan...' : 'Redirecting...'}
               </p>
            </div>
          </div>
        )}
    </div>
  );
};

export default Upload;
