import { useState } from "react";
import type { KycSubmission } from "@pxo/shared/types";
import { useKYC } from "../../hooks/useKYC";
import { X, Check, XCircle, AlertCircle } from "lucide-react";

interface KycDetailsModalProps {
  submission: KycSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: () => void;
}

// Convierte un storage path a URL pública del bucket pxos-files.
const getImageUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // NEXT_PUBLIC_SUPABASE_URL was a dead fallback here: Vite exposes only
  // VITE_*, so it never resolved.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/pxos-files/${path}`;
};

const Button = ({ children, variant = "default", onClick, disabled, className = "" }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      variant === "outline" ? "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800" :
      variant === "destructive" ? "bg-red-600 text-white hover:bg-red-700" :
      variant === "default" ? "bg-blue-600 text-white hover:bg-blue-700" :
      "bg-green-600 text-white hover:bg-green-700"
    } ${className}`}
  >
    {children}
  </button>
);

const Modal = ({ children, open }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {children}
      </div>
    </div>
  );
};

const STATUS_LABEL: Record<KycSubmission['status'], string> = {
  pending_review: 'Under Validation',
  approved: 'Validated',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_BADGE: Record<KycSubmission['status'], string> = {
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export function KycDetailsModal({ submission, open, onOpenChange, onStatusUpdate }: KycDetailsModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const { reviewSubmission, loading: isUpdating, error: reviewError } = useKYC();

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!submission) return;
    try {
      await reviewSubmission(
        submission.id,
        action,
        action === 'reject' ? rejectionReason : undefined,
      );
      onStatusUpdate();
      onOpenChange(false);
      setRejectionReason("");
    } catch (error) {
      console.error('Error reviewing submission:', error);
    }
  };

  if (!submission) return null;

  const pi = submission.personal_info;
  const idFront = submission.documents.find((d) => d.type === 'id_front');
  const idBack = submission.documents.find((d) => d.type === 'id_back');

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">KYC Details</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Personal info */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">User Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <p className="text-gray-900 dark:text-white">{pi?.fullName ?? 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                <p className="text-gray-900 dark:text-white">{pi?.dateOfBirth ?? 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <p className="text-gray-900 dark:text-white">{pi?.email ?? 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <p className="text-gray-900 dark:text-white">{pi?.phone ?? 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                <p className="text-gray-900 dark:text-white">{pi?.country ?? 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Document #</label>
                <p className="text-gray-900 dark:text-white">{pi?.documentNumber ?? 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Identification Document</h3>
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Document Type</label>
                <p className="text-gray-900 dark:text-white capitalize">{pi?.documentType ?? '—'}</p>
              </div>

              {pi?.documentType === 'passport' && idFront && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Passport</label>
                  <div className="mt-2">
                    <a href={getImageUrl(idFront.path)} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={getImageUrl(idFront.path)}
                        alt="Passport"
                        className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </a>
                  </div>
                </div>
              )}

              {pi?.documentType !== 'passport' && (idFront || idBack) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Identity Document</label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    {idFront && (
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">Front ID</h3>
                        <a href={getImageUrl(idFront.path)} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={getImageUrl(idFront.path)}
                            alt="Front ID"
                            className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      </div>
                    )}
                    {idBack && (
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">Back ID</h3>
                        <a href={getImageUrl(idBack.path)} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={getImageUrl(idBack.path)}
                            alt="Back ID"
                            className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Current Status</h3>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[submission.status]}`}>
                {STATUS_LABEL[submission.status]}
              </span>
              {submission.rejection_reason && (
                <div className="mt-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rejection reason</label>
                  <p className="text-gray-900 dark:text-white">{submission.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions (sólo si pending_review) */}
          {submission.status === 'pending_review' && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Actions</h3>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <Button
                    onClick={() => handleReview('approve')}
                    disabled={isUpdating}
                    className="flex items-center space-x-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Approve</span>
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => handleReview('reject')}
                    disabled={isUpdating || rejectionReason.trim().length < 3}
                    className="flex items-center space-x-2"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rejection reason (required to reject, min 3 characters)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify the reason for rejection..."
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    rows={3}
                  />
                </div>

                {reviewError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{reviewError}</p>
                )}
              </div>
            </div>
          )}

          {isUpdating && (
            <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400">
              <AlertCircle className="h-4 w-4 animate-spin" />
              <span>Updating status...</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
