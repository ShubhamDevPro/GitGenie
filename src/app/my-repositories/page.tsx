'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClonedRepository {
    id: string;
    repoName: string;
    githubOwner: string;
    githubRepo: string;
    githubUrl: string;
    giteaRepoName: string;
    giteaCloneUrl: string;
    giteaWebUrl: string;
    connectionStatus: string;
    createdAt: string;
    clonedAt: string;
    lastSyncAt: string;
}

interface UserData {
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
        mappingMethod: string;
    };
    repositories: ClonedRepository[];
    summary: {
        totalRepositories: number;
        connectedRepositories: number;
        mappingIntegrity: string;
    };
}

export default function MyRepositoriesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/login');
            return;
        }

        fetchUserRepositories();
    }, [session, status, router]);

    const fetchUserRepositories = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/repositories/user-repositories');
            
            if (!response.ok) {
                throw new Error('Failed to fetch repositories');
            }

            const data = await response.json();
            setUserData(data);
        } catch (error) {
            console.error('Error fetching user repositories:', error);
            setError(error instanceof Error ? error.message : 'Failed to load repositories');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRepository = async (projectId: string) => {
        if (!confirm('Are you sure you want to delete this repository? This will remove it from both your workspace and Gitea.')) {
            return;
        }

        try {
            const response = await fetch(`/api/repositories/${projectId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete repository');
            }

            // Refresh the data
            await fetchUserRepositories();
        } catch (error) {
            console.error('Error deleting repository:', error);
            alert('Failed to delete repository. Please try again.');
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your repositories...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-4">Error</div>
                    <p className="text-gray-600">{error}</p>
                    <button 
                        onClick={fetchUserRepositories}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Cloned Repositories</h1>
                    <p className="mt-2 text-gray-600">
                        Manage your cloned repositories from GitHub to your private Gitea workspace
                    </p>
                </div>

                {userData && (
                    <>
                        {/* User Summary */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Summary</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-blue-600">{userData.summary.totalRepositories}</div>
                                    <div className="text-sm text-blue-800">Total Repositories</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-green-600">{userData.summary.connectedRepositories}</div>
                                    <div className="text-sm text-green-800">Connected</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-sm text-gray-600">Integration Method</div>
                                    <div className="font-medium">{userData.giteaIntegration.mappingMethod}</div>
                                </div>
                            </div>
                        </div>

                        {/* Repositories List */}
                        {userData.repositories.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                                <div className="text-gray-400 text-6xl mb-4">📁</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories cloned yet</h3>
                                <p className="text-gray-600 mb-4">
                                    Start by going to the dashboard and cloning your first repository from GitHub.
                                </p>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Go to Dashboard
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-lg font-medium text-gray-900">Cloned Repositories</h2>
                                </div>
                                <div className="divide-y divide-gray-200">
                                    {userData.repositories.map((repo) => (
                                        <div key={repo.id} className="p-6 hover:bg-gray-50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <h3 className="text-lg font-medium text-gray-900">
                                                            {repo.githubOwner}/{repo.githubRepo}
                                                        </h3>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            repo.connectionStatus === 'connected' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {repo.connectionStatus}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-2 text-sm text-gray-600">
                                                        <div className="flex items-center space-x-4">
                                                            <span>
                                                                <strong>Source:</strong> 
                                                                <a 
                                                                    href={repo.githubUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                                                >
                                                                    {repo.githubUrl}
                                                                </a>
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center space-x-4">
                                                            <span><strong>Gitea Repository:</strong> {repo.giteaRepoName}</span>
                                                            <span><strong>Cloned:</strong> {new Date(repo.clonedAt).toLocaleDateString()}</span>
                                                        </div>
                                                        {repo.giteaCloneUrl && (
                                                            <div className="flex items-center space-x-2">
                                                                <span><strong>Clone URL:</strong></span>
                                                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                                                    {repo.giteaCloneUrl}
                                                                </code>
                                                                <button
                                                                    onClick={() => navigator.clipboard.writeText(repo.giteaCloneUrl)}
                                                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                                                >
                                                                    Copy
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2 ml-4">
                                                    {repo.giteaWebUrl && (
                                                        <a
                                                            href={repo.giteaWebUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                        >
                                                            View in Gitea
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteRepository(repo.id)}
                                                        className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
