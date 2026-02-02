import { useEffect, useState } from "react";
import {
  Upload as UploadIcon,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { useOutletContext } from "react-router";

import AuthRequiredModal from "./AuthRequiredModal";

const Upload = ({ onComplete, className = "" }: UploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [progress, setProgress] = useState(0);
  const [base64Data, setBase64Data] = useState<string | null>(null);

  const [authRequired, setAuthRequired] = useState(false);
  const { isSignedIn, signIn } = useOutletContext<AuthContext>();

  const ensureSignedInForUpload = async () => {
    if (isSignedIn) {
      return true;
    }

    setAuthRequired(true);

    try {
      const signedIn = await signIn();
      if (signedIn) {
        setAuthRequired(false);
        return true;
      }
    } catch (error) {
      console.error("Puter sign-in failed:", error);
    }

    return false;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const canUpload = await ensureSignedInForUpload();
    if (!canUpload) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const canUpload = await ensureSignedInForUpload();

    if (!canUpload) {
      e.currentTarget.value = "";
      return;
    }

    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
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
    <div className={`upload ${className}`}>
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`dropzone ${isDragging ? "is-dragging" : ""}`}
        >
          <input
            type="file"
            className="drop-input"
            onChange={handleFileSelect}
            accept=".jpg,.jpeg,.png"
          />

          <div className="drop-content">
            <div className="drop-icon">
              <UploadIcon size={20} />
            </div>
            <p>Click to upload or drag and drop</p>
            <p className="help">Maximum file size 50 MB.</p>
          </div>
        </div>
      ) : (
        <div className="upload-status">
          <div className="status-content">
            <div className="status-icon">
              {progress === 100 ? (
                <CheckCircle2 className="check" />
              ) : (
                <ImageIcon className="image" />
              )}
            </div>

            <h3>{file.name}</h3>

            <div className="progress">
              <div
                className="bar"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="status-text">
              {progress < 100 ? "Analyzing Floor Plan..." : "Redirecting..."}
            </p>
          </div>
        </div>
      )}

      <AuthRequiredModal
        isOpen={authRequired}
        onConfirm={async () => {
          try {
            const signedIn = await signIn();
            if (signedIn) setAuthRequired(false);
          } catch (error) {
            console.error("Puter sign-in failed:", error);
          }
        }}
        onCancel={() => setAuthRequired(false)}
        description="Sign in with your Puter account to upload a floor plan."
      />
    </div>
  );
};

export default Upload;
