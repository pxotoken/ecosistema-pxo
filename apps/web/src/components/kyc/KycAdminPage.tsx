import { useState } from "react";
import { KycRequestsTable } from "./KycRequestsTable";
import { KycDetailsModal } from "./KycDetailsModal";
import { KycRequest } from "../../../types/kyc";
import useAuth from "../../hooks/useAuth";
import { Loader2 } from "lucide-react";

export function KycAdminPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<KycRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revalidationKey, setRevalidationKey] = useState(0);
  const [activeTab, setActiveTab] = useState("validating");

  const handleStatusUpdate = () => {
    setRevalidationKey(prev => prev + 1);
  };

  // Check if user is admin
  const isAdmin = user?.user_type?.includes("989e3702-b515-4d6e-8627-fa0142a1a88f") || 
                  user?.mail === "admin@pxo.com";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-2">You must be authenticated to access this page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-2">You do not have administrator permissions to access this page.</p>
      </div>
    );
  }

  const tabs = [
    { value: "validating", label: "Under Validation" },
    { value: "validated", label: "Validated" },
    { value: "rejected", label: "Rejected" }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">KYC Management</h1>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "validating" && (
          <KycRequestsTable 
            status="VALIDATING"
            onViewDetails={(request) => {
              setSelectedRequest(request);
              setIsModalOpen(true);
            }}
            revalidationKey={revalidationKey}
          />
        )}
        
        {activeTab === "validated" && (
          <KycRequestsTable 
            status="VALIDATED"
            onViewDetails={(request) => {
              setSelectedRequest(request);
              setIsModalOpen(true);
            }}
            revalidationKey={revalidationKey}
          />
        )}
        
        {activeTab === "rejected" && (
          <KycRequestsTable 
            status="REJECTED"
            onViewDetails={(request) => {
              setSelectedRequest(request);
              setIsModalOpen(true);
            }}
            revalidationKey={revalidationKey}
          />
        )}
      </div>

      <KycDetailsModal
        request={selectedRequest}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
