import { AlertTriangle } from "lucide-react";

import { Button } from "./ui/Button";

const AuthRequiredModal = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Sign in required",
  description = "Sign in with your Puter account to continue.",
  confirmLabel = "Sign in with Puter",
}: AuthRequiredModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="auth-modal animate-in fade-in duration-200">
      <div className="panel">
        <div className="icon">
          <AlertTriangle className="alert" />
        </div>

        <h3>{title}</h3>
        <p>{description}</p>

        <div className="actions">
          <Button onClick={onConfirm} fullWidth className="confirm">
            {confirmLabel}
          </Button>

          <button onClick={onCancel} className="cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthRequiredModal;
