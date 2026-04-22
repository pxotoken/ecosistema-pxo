import { useState } from "react";
import { KycRequestsTable } from "./KycRequestsTable";
import { KycDetailsModal } from "./KycDetailsModal";
import type { KycSubmission, KycSubmissionStatus } from "@pxo/shared/types";
import useAuth from "../../hooks/useAuth";
import { Loader2 } from "lucide-react";

type AdminTab = Extract<KycSubmissionStatus, 'pending_review' | 'approved' | 'rejected'>;

const TABS: Array<{ value: AdminTab; label: string }> = [
  { value: 'pending_review', label: 'Under Validation' },
  { value: 'approved', label: 'Validated' },
  { value: 'rejected', label: 'Rejected' },
];

export function KycAdminPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [selected, setSelected] = useState<KycSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revalidationKey, setRevalidationKey] = useState(0);
  const [activeTab, setActiveTab] = useState<AdminTab>('pending_review');

  const handleStatusUpdate = () => {
    setRevalidationKey((prev) => prev + 1);
  };

  // TODO ADR-0001: reemplazar este check por un helper hasRole(user, 'admin').
  const isAdmin =
    user?.user_type?.includes("989e3702-b515-4d6e-8627-fa0142a1a88f") ||
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">KYC Management</h1>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {TABS.map((tab) => (
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

      <KycRequestsTable
        status={activeTab}
        onViewDetails={(submission) => {
          setSelected(submission);
          setIsModalOpen(true);
        }}
        revalidationKey={revalidationKey}
      />

      <KycDetailsModal
        submission={selected}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
