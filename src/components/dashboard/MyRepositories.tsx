import React, { useState, useEffect } from 'react';

interface ClonedRepository {
    id: string;
    repoName: string;
    repoUrl: string;
    githubOwner: string;
    githubRepo: string;
    githubUrl: string;
    giteaRepoName: string;
    giteaCloneUrl: string;
    giteaWebUrl: string;
    clonedAt: string;
    connectionStatus: string;
}

interface MyRepositoriesProps {
    userId?: string;
}

export const MyRepositories: React.FC<MyRepositoriesProps> = ({ userId }) => {
    const [repositories, setRepositories] = useState<ClonedRepository[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchRepositories();
    }, []);

    const fetchRepositories = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch('/api/repositories/clone');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch repositories');
            }

            setRepositories(data.repositories || []);
        } catch (err) {
            console.error('Error fetching repositories:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (projectId: string, repoName: string) => {
        if (!confirm(`Are you sure you want to delete "${repoName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setDeletingId(projectId);
            setError('');

            const response = await fetch(`/api/repositories/${projectId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete repository');
            }

            // Remove from local state
            setRepositories(prev => prev.filter(repo => repo.id !== projectId));

        } catch (err) {
            console.error('Error deleting repository:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete repository');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl border border-white/20 dark:border-gray-700/20">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4 w-1/3"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    My Cloned Repositories
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {repositories.length} repositories
                </span>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">❌ {error}</p>
                    <button
                        onClick={() => setError('')}
                        className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {repositories.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No repositories cloned yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Start by searching and cloning repositories from GitHub
                    </p>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300"
                    >
                        Browse Repositories
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {repositories.map((repo) => (
                        <div
                            key={repo.id}
                            className="p-4 bg-white/50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                            {repo.giteaRepoName}
                                        </h3>
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                                            {repo.connectionStatus}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                        Cloned from: <a
                                            href={repo.githubUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 dark:text-purple-400 hover:underline"
                                        >
                                            {repo.githubOwner}/{repo.githubRepo}
                                        </a>
                                    </p>

                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        Cloned on: {formatDate(repo.clonedAt)}
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={repo.githubUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                                        >
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                            </svg>
                                            Original
                                        </a>

                                        <button
                                            onClick={() => navigator.clipboard.writeText(repo.giteaCloneUrl)}
                                            className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 rounded-lg text-xs hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                                            title="Copy clone URL"
                                        >
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Clone URL
                                        </button>
                                    </div>
                                </div>

                                <div className="ml-4">
                                    <button
                                        onClick={() => handleDelete(repo.id, repo.giteaRepoName)}
                                        disabled={deletingId === repo.id}
                                        className={`p-2 rounded-lg transition-colors ${deletingId === repo.id
                                                ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed'
                                                : 'bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-800/30 text-red-700 dark:text-red-200'
                                            }`}
                                        title="Delete repository"
                                    >
                                        {deletingId === repo.id ? (
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
