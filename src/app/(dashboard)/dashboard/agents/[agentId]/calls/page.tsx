'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../../../../../convex/_generated/api';
import { Button } from '@/shared/components/ui/button';

interface Conversation {
  conversation_id: string;
  agent_id: string;
  start_time_unix_secs: number;
  call_duration_secs?: number;
  transcript?: string;
  metadata?: {
    call_duration?: number;
  };
  analysis?: {
    call_successful?: boolean;
  };
}

interface ConversationsResponse {
  conversations: Conversation[];
  has_more: boolean;
  next_cursor?: string;
}

type SortField = 'date' | 'duration';
type SortOrder = 'asc' | 'desc';

export default function AgentCallsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const agentId = params.agentId as string;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Get agent details from Convex
  const agent = useQuery(api.agents.getByElevenLabsAgentId, {
    elevenLabsAgentId: agentId,
  });

  // Auth guard - redirect to sign in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch conversations from our API
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/elevenlabs/agents/${agentId}/conversations`);

        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }

        const data: ConversationsResponse = await response.json();
        setConversations(data.conversations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };

    if (agentId && isSignedIn) {
      fetchConversations();
    }
  }, [agentId, isSignedIn]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCalls = conversations.length;
    const totalDurationSecs = conversations.reduce((sum, conv) => sum + (conv.call_duration_secs || 0), 0);
    const totalMinutes = Math.floor(totalDurationSecs / 60);
    const avgDurationSecs = totalCalls > 0 ? Math.floor(totalDurationSecs / totalCalls) : 0;

    return {
      totalCalls,
      totalDurationSecs,
      totalMinutes,
      avgDurationSecs,
    };
  }, [conversations]);

  // Filter and sort conversations
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = [...conversations];

    // Apply date filters
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime() / 1000;
      filtered = filtered.filter(conv => conv.start_time_unix_secs >= startTimestamp);
    }
    if (endDate) {
      const endTimestamp = new Date(endDate + 'T23:59:59').getTime() / 1000;
      filtered = filtered.filter(conv => conv.start_time_unix_secs <= endTimestamp);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'date') {
        comparison = a.start_time_unix_secs - b.start_time_unix_secs;
      } else if (sortField === 'duration') {
        const durationA = a.call_duration_secs || 0;
        const durationB = b.call_duration_secs || 0;
        comparison = durationA - durationB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [conversations, startDate, endDate, sortField, sortOrder]);

  // Show loading while checking auth
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  const formatDate = (unixSecs: number) => {
    const date = new Date(unixSecs * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order if clicking same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default desc order
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Call History</h1>
          <p className="text-muted-foreground mt-2">
            {agent ? agent.name : 'Agent'} - All conversations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {!isLoading && conversations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="text-sm text-muted-foreground mb-1">Total Calls</div>
            <div className="text-3xl font-bold text-black">{stats.totalCalls}</div>
          </div>
          <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="text-sm text-muted-foreground mb-1">Total Duration</div>
            <div className="text-3xl font-bold text-black">{stats.totalMinutes} min</div>
          </div>
          <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="text-sm text-muted-foreground mb-1">Avg Call Duration</div>
            <div className="text-3xl font-bold text-black">{formatDuration(stats.avgDurationSecs)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {!isLoading && conversations.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-black block mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-black block mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {(startDate || endDate) && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Calls Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading calls...</div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="text-4xl mb-4">📞</div>
          <h3 className="text-xl font-semibold mb-2 text-black">No calls yet</h3>
          <p className="text-muted-foreground">
            Calls will appear here once your agent receives them
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-card shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-2">
                        Date & Time
                        {sortField === 'date' && (
                          <span className="text-primary">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('duration')}
                    >
                      <div className="flex items-center gap-2">
                        Duration
                        {sortField === 'duration' && (
                          <span className="text-primary">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Recording
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAndSortedConversations.map((conversation) => (
                    <tr
                      key={conversation.conversation_id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-black">
                          {formatDate(conversation.start_time_unix_secs)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-black">
                          {formatDuration(conversation.call_duration_secs)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <audio
                          controls
                          preload="metadata"
                          className="h-10"
                          src={`/api/elevenlabs/conversations/${conversation.conversation_id}/audio`}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            conversation.analysis?.call_successful
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {conversation.analysis?.call_successful ? 'Successful' : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {filteredAndSortedConversations.length === 0 && (startDate || endDate) && (
            <div className="text-center py-8 text-muted-foreground">
              No calls found in the selected date range
            </div>
          )}
        </>
      )}
    </div>
  );
}
