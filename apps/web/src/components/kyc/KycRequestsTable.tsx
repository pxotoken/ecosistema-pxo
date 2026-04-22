import { useState, useEffect, useMemo } from "react";
import type { KycSubmission, KycSubmissionStatus } from "@pxo/shared/types";
import { useKycRequests } from "../../hooks/useKycRequests";
import { Loader2, Eye, ChevronDown, ChevronRight, Search } from "lucide-react";

const Button = ({ children, variant = "default", size = "default", onClick, className = "" }: any) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      variant === "outline" ? "border border-gray-300 hover:bg-gray-50" :
      variant === "ghost" ? "hover:bg-gray-100" :
      "bg-blue-600 text-white hover:bg-blue-700"
    } ${size === "sm" ? "px-2 py-1 text-xs" : ""} ${className}`}
  >
    {children}
  </button>
);

const Input = ({ placeholder, value, onChange, className = "" }: any) => (
  <input
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);

interface KycRequestsTableProps {
  status: KycSubmissionStatus;
  onViewDetails: (submission: KycSubmission) => void;
  revalidationKey?: number;
}

interface GroupedSubmissions {
  [userId: string]: {
    latest: KycSubmission;
    history: KycSubmission[];
  };
}

const STATUS_LABEL: Record<KycSubmissionStatus, string> = {
  pending_review: 'Under Validation',
  approved: 'Validated',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_BADGE: Record<KycSubmissionStatus, string> = {
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export function KycRequestsTable({
  status,
  onViewDetails,
  revalidationKey = 0,
}: KycRequestsTableProps) {
  const { submissions, isLoading } = useKycRequests(status, revalidationKey);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const grouped = useMemo<GroupedSubmissions>(() => {
    const term = debouncedQuery.toLowerCase();
    const filtered = submissions.filter((s) => {
      const fullName = (s.personal_info?.fullName ?? '').toLowerCase();
      const email = (s.personal_info?.email ?? '').toLowerCase();
      return fullName.includes(term) || email.includes(term);
    });

    return filtered.reduce<GroupedSubmissions>((acc, submission) => {
      if (!acc[submission.user_id]) {
        acc[submission.user_id] = { latest: submission, history: [] };
      } else {
        const currentDate = new Date(submission.created_at);
        const latestDate = new Date(acc[submission.user_id].latest.created_at);
        if (currentDate > latestDate) {
          acc[submission.user_id].history.push(acc[submission.user_id].latest);
          acc[submission.user_id].latest = submission;
        } else {
          acc[submission.user_id].history.push(submission);
        }
      }
      return acc;
    }, {});
  }, [submissions, debouncedQuery]);

  const toggleUser = (userId: string) => {
    const next = new Set(expandedUsers);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setExpandedUsers(next);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg">
        <div className="bg-muted/50 p-4 grid grid-cols-6 gap-4 font-medium text-sm">
          <div>User</div>
          <div>Email</div>
          <div>Document Type</div>
          <div>Status</div>
          <div>Date</div>
          <div>Actions</div>
        </div>

        <div className="divide-y">
          {Object.entries(grouped).map(([userId, { latest, history }]) => {
            const pi = latest.personal_info;
            return (
              <div key={userId}>
                <div className="p-4 grid grid-cols-6 gap-4 items-center">
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleUser(userId)}>
                      {expandedUsers.has(userId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <span>{pi?.fullName ?? '—'}</span>
                  </div>
                  <div>{pi?.email ?? '—'}</div>
                  <div className="capitalize">{pi?.documentType ?? '—'}</div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[latest.status]}`}>
                      {STATUS_LABEL[latest.status]}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(latest.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => onViewDetails(latest)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>

                {expandedUsers.has(userId) && history.length > 0 && (
                  <div className="bg-muted/30 p-4">
                    <h4 className="font-medium mb-2">Submission history:</h4>
                    <div className="space-y-2">
                      {history.map((s) => (
                        <div key={s.id} className="grid grid-cols-5 gap-4 text-sm">
                          <div>{s.personal_info?.fullName ?? '—'}</div>
                          <div>{s.personal_info?.email ?? '—'}</div>
                          <div className="capitalize">{s.personal_info?.documentType ?? '—'}</div>
                          <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[s.status]}`}>
                              {STATUS_LABEL[s.status]}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {Object.keys(grouped).length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No submissions with status "{STATUS_LABEL[status].toLowerCase()}"
          </div>
        )}
      </div>
    </div>
  );
}
