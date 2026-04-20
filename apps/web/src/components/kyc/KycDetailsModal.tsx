import { useState } from "react";
import { KycRequest } from "../../../types/kyc";
import { X, Check, XCircle, AlertCircle } from "lucide-react";

interface KycDetailsModalProps {
  request: KycRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: () => void;
}

// Helper function to get full image URL
const getImageUrl = (path: string) => {
  // If the path is already a complete URL, return it as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Otherwise, construct the full URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/pxos-files/${path}`;
};

// Simple Button component
const Button = ({ children, variant = "default", onClick, className = "" }: any) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      variant === "outline" ? "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800" :
      variant === "destructive" ? "bg-red-600 text-white hover:bg-red-700" :
      variant === "default" ? "bg-blue-600 text-white hover:bg-blue-700" :
      "bg-green-600 text-white hover:bg-green-700"
    } ${className}`}
  >
    {children}
  </button>
);

// Simple Modal component
const Modal = ({ children, open, onOpenChange }: any) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {children}
      </div>
    </div>
  );
};

export function KycDetailsModal({ request, open, onOpenChange, onStatusUpdate }: KycDetailsModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (status: KycRequest["status"]) => {
    if (!request) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/kyc/update-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          requestId: request.id,
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Error updating KYC status');
      }

      onStatusUpdate();
      onOpenChange(false);
      setRejectionReason("");
    } catch (error) {
      console.error('Error updating KYC status:', error);
      alert('Error updating KYC status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!request) return null;

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
          {/* Información del usuario */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">User Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <p className="text-gray-900 dark:text-white">{request.first_name} {request.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <p className="text-gray-900 dark:text-white">{request.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <p className="text-gray-900 dark:text-white">{request.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                <p className="text-gray-900 dark:text-white">{request.country || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Documento */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Identification Document</h3>
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Document Type</label>
                <p className="text-gray-900 dark:text-white capitalize">{request.legal_identification_type}</p>
              </div>
              
              {request.legal_identification_type === 'passport' && request.passport && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Passport</label>
                  <div className="mt-2">
                    <a 
                      href={getImageUrl(request.passport)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={getImageUrl(request.passport)} 
                        alt="Passport" 
                        className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </a>
                  </div>
                </div>
              )}
              
              {request.legal_identification_type === 'dni' && request.identification_photos && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Identity Document</label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    {request.identification_photos.map((photo, index) => (
                      <div key={index} className="space-y-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {index === 0 ? "Front ID" : "Back ID"}
                        </h3>
                        <a 
                          href={getImageUrl(photo)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            key={index}
                            src={getImageUrl(photo)} 
                            alt={`Documento ${index + 1}`} 
                            className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Estado actual */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Current Status</h3>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                request.status === 'VALIDATED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                request.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                request.status === 'VALIDATING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {request.status}
              </span>
              {request.rejection_reason && (
                <div className="mt-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rejection reason</label>
                  <p className="text-gray-900 dark:text-white">{request.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          {request.status === 'VALIDATING' && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Actions</h3>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <Button
                    onClick={() => handleStatusUpdate('VALIDATED')}
                    disabled={isUpdating}
                    className="flex items-center space-x-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Validate</span>
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusUpdate('REJECTED')}
                    disabled={isUpdating}
                    className="flex items-center space-x-2"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </Button>
                </div>

                {/* Motivo de rechazo */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rejection reason (optional)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify the reason for rejection..."
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {isUpdating && (
            <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400">
              <AlertCircle className="h-4 w-4 animate-spin" />
              <span>Actualizando estado...</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
