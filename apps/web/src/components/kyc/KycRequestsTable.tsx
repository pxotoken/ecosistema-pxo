import { useState, useEffect, useMemo } from "react";
import { KycRequest } from "../../../types/kyc";
import { useKycRequests } from "../../hooks/useKycRequests";
import { Loader2, Eye, ChevronDown, ChevronRight, Search } from "lucide-react";

// Simple Button component
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

// Simple Input component
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
  status: KycRequest["status"];
  onViewDetails: (request: KycRequest) => void;
  revalidationKey?: number;
}

interface GroupedRequests {
  [userId: string]: {
    latest: KycRequest;
    history: KycRequest[];
  }
}

export function KycRequestsTable({ 
  status, 
  onViewDetails,
  revalidationKey = 0
}: KycRequestsTableProps) {
  const { requests, isLoading } = useKycRequests(status, revalidationKey);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtrar y agrupar requests
  const groupedRequests = useMemo(() => {
    const filteredRequests = requests.filter(request => {
      const searchTerm = debouncedQuery.toLowerCase();
      const fullName = `${request.first_name} ${request.last_name}`.toLowerCase();
      const email = request.email.toLowerCase();
      
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    });

    return filteredRequests.reduce((acc: GroupedRequests, request) => {
      if (!acc[request.user_id]) {
        acc[request.user_id] = {
          latest: request,
          history: []
        };
      } else {
        const currentDate = new Date(request.created_at!);
        const latestDate = new Date(acc[request.user_id].latest.created_at!);
        
        if (currentDate > latestDate) {
          acc[request.user_id].history.push(acc[request.user_id].latest);
          acc[request.user_id].latest = request;
        } else {
          acc[request.user_id].history.push(request);
        }
      }
      return acc;
    }, {});
  }, [requests, debouncedQuery]);

  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
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
          <div>Acciones</div>
        </div>

        <div className="divide-y">
          {Object.entries(groupedRequests).map(([userId, { latest, history }]) => (
            <div key={userId}>
              <div className="p-4 grid grid-cols-6 gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleUser(userId)}
                  >
                    {expandedUsers.has(userId) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <span>{latest.first_name} {latest.last_name}</span>
                </div>
                <div>{latest.email}</div>
                <div className="capitalize">{latest.legal_identification_type}</div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    latest.status === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                    latest.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    latest.status === 'VALIDATING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {latest.status}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(latest.created_at!).toLocaleDateString()}
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(latest)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                </div>
              </div>

              {expandedUsers.has(userId) && history.length > 0 && (
                <div className="bg-muted/30 p-4">
                  <h4 className="font-medium mb-2">Request history:</h4>
                  <div className="space-y-2">
                    {history.map((request) => (
                      <div key={request.id} className="grid grid-cols-5 gap-4 text-sm">
                        <div>{request.first_name} {request.last_name}</div>
                        <div>{request.email}</div>
                        <div className="capitalize">{request.legal_identification_type}</div>
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                            request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            request.status === 'VALIDATING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(request.created_at!).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(groupedRequests).length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No requests with status "{status.toLowerCase()}"
          </div>
        )}
      </div>
    </div>
  );
}
