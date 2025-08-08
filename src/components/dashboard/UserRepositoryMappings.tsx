import React, { useState, useEffect } from 'react';

interface UserRepositoryMapping {
    appUser: {
        id: string;
        email: string;
        name: string | null;
        createdAt: string;
    };
    giteaIntegration: {
        giteaEmail: string | null;
        giteaCreatedAt: string | null;
        hasToken: boolean;
        mappingMethod: 'email-based';
    };
    repositories: Array<{
        id: string;
        name: string;
        source: string;
        giteaRepoId: number | null;
        giteaRepoName: string | null;
        clonedAt: string | null;
        status: string;
        mappingStatus: 'properly_mapped' | 'mapping_issue';
    }>;
    summary: {
        totalRepositories: number;
        repositoriesWithMappingIssues: number;
        hasGiteaIntegration: boolean;
        mappingIntegrity: 'good' | 'needs_attention';
    };
}

interface UserMappingsData {
    summary: {
        totalUsers: number;
        usersWithGiteaIntegration: number;
        totalRepositories: number;
        repositoriesWithIssues: number;
        giteaServerUrl: string;
        mappingIntegrityPercentage: number;
    };
    userMappings: UserRepositoryMapping[];
    recommendations: string[];
}

const UserRepositoryMappings: React.FC = () => {
    const [data, setData] = useState<UserMappingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchMappingData();
    }, []);

    const fetchMappingData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/user-mappings');
            if (!response.ok) {
                throw new Error('Failed to fetch mapping data');
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const toggleUserExpansion = (userId: string) => {
        const newExpanded = new Set(expandedUsers);
        if (newExpanded.has(userId)) {
            newExpanded.delete(userId);
        } else {
            newExpanded.add(userId);
        }
        setExpandedUsers(newExpanded);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'text-green-600 bg-green-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'failed': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getMappingStatusColor = (status: 'properly_mapped' | 'mapping_issue') => {
        return status === 'properly_mapped'
            ? 'text-green-600 bg-green-100'
            : 'text-red-600 bg-red-100';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800">
                    Error loading mapping data: {error}
                </div>
                <button
                    onClick={fetchMappingData}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!data) {
        return <div>No data available</div>;
    }

    return (
        <div className="space-y-6">
            {/* Summary Section */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    User-Repository Mapping Overview
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                            {data.summary.totalUsers}
                        </div>
                        <div className="text-sm text-blue-800">Total Users</div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                            {data.summary.usersWithGiteaIntegration}
                        </div>
                        <div className="text-sm text-green-800">With Gitea Integration</div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                            {data.summary.totalRepositories}
                        </div>
                        <div className="text-sm text-purple-800">Total Repositories</div>
                    </div>

                    <div className={`p-4 rounded-lg ${data.summary.repositoriesWithIssues === 0
                        ? 'bg-green-50'
                        : 'bg-red-50'
                        }`}>
                        <div className={`text-2xl font-bold ${data.summary.repositoriesWithIssues === 0
                            ? 'text-green-600'
                            : 'text-red-600'
                            }`}>
                            {data.summary.mappingIntegrityPercentage}%
                        </div>
                        <div className={`text-sm ${data.summary.repositoriesWithIssues === 0
                            ? 'text-green-800'
                            : 'text-red-800'
                            }`}>
                            Mapping Integrity
                        </div>
                    </div>
                </div>

                {/* Architecture Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Gitea Server Configuration</h3>
                    <div className="text-sm text-gray-600">
                        <p><strong>Server URL:</strong> {data.summary.giteaServerUrl}</p>
                        <p><strong>Mapping Method:</strong> Email-based (no stored giteaUserId/giteaUsername)</p>
                        <p><strong>Note:</strong> Users cannot access the Gitea web interface directly. All repository management is handled through GitGenie.</p>
                    </div>
                </div>

                {/* Recommendations */}
                {data.recommendations.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-800 mb-2">Recommendations</h3>
                        <ul className="list-disc list-inside text-sm text-yellow-700">
                            {data.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* User Mappings List */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        User Repository Mappings
                    </h3>
                </div>

                <div className="divide-y divide-gray-200">
                    {data.userMappings.map((userMapping) => (
                        <div key={userMapping.appUser.id} className="p-6">
                            <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleUserExpansion(userMapping.appUser.id)}
                            >
                                <div className="flex items-center space-x-4">
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {userMapping.appUser.name || 'Unnamed User'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {userMapping.appUser.email}
                                        </div>
                                    </div>

                                    <div className={`px-2 py-1 text-xs rounded-full ${userMapping.summary.mappingIntegrity === 'good'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {userMapping.summary.mappingIntegrity === 'good' ? 'Good' : 'Issues'}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">
                                        {userMapping.summary.totalRepositories} repos
                                    </span>
                                    <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedUsers.has(userMapping.appUser.id) ? 'rotate-180' : ''
                                            }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {expandedUsers.has(userMapping.appUser.id) && (
                                <div className="mt-4 pl-4 border-l-2 border-gray-200">
                                    {/* Gitea Integration Info */}
                                    <div className="mb-4 p-3 bg-gray-50 rounded">
                                        <h4 className="font-medium text-gray-900 mb-2">Gitea Integration (Email-based Mapping)</h4>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p><strong>Gitea Email:</strong> {userMapping.giteaIntegration.giteaEmail || 'Not found'}</p>
                                            <p><strong>Integration Created:</strong> {
                                                userMapping.giteaIntegration.giteaCreatedAt
                                                    ? new Date(userMapping.giteaIntegration.giteaCreatedAt).toLocaleDateString()
                                                    : 'Not set'
                                            }</p>
                                            <p><strong>Token:</strong> {userMapping.giteaIntegration.hasToken ? 'Yes' : 'Using admin token'}</p>
                                            <p><strong>Mapping Method:</strong> <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{userMapping.giteaIntegration.mappingMethod}</span></p>
                                        </div>
                                    </div>

                                    {/* Repositories */}
                                    {userMapping.repositories.length > 0 ? (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Repositories</h4>
                                            <div className="space-y-2">
                                                {userMapping.repositories.map((repo) => (
                                                    <div key={repo.id} className="flex items-center justify-between p-3 bg-white border rounded">
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {repo.name}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                Source: {repo.source}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                Gitea: {repo.giteaRepoName || 'Not set'}
                                                            </div>
                                                        </div>

                                                        <div className="flex space-x-2">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(repo.status)}`}>
                                                                {repo.status}
                                                            </span>
                                                            <span className={`px-2 py-1 text-xs rounded-full ${getMappingStatusColor(repo.mappingStatus)}`}>
                                                                {repo.mappingStatus === 'properly_mapped' ? 'Mapped' : 'Issue'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 italic">
                                            No repositories cloned yet
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UserRepositoryMappings;
