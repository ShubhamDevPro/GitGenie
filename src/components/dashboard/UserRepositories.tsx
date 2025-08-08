import { useState, useEffect } from 'react';

interface Repository {
    id: string;
    name: string;
    originalRepo: string;
    originalUrl: string;
    cloneUrl: string;
    status: string;
    clonedAt: string;
    lastSyncAt?: string;
    userMapping: {
        userEmail: string;
        userName: string | null;
        giteaUsername: string | null;
        repositoryOwner: string;
        isProperlyMapped: boolean;
    };
}

interface UserRepositoriesProps {
    userId: string;
}

export default function UserRepositories({ userId }: UserRepositoriesProps) {
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        fetchRepositories();
    }, [userId]);

    const fetchRepositories = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/repositories/clone');

            if (!response.ok) {
                throw new Error('Failed to fetch repositories');
            }

            const data = await response.json();
            setRepositories(data.repositories);
            setUserInfo(data.userInfo);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCloneUrl = (cloneUrl: string) => {
        navigator.clipboard.writeText(cloneUrl);
        // You could add a toast notification here
    };

    const getAccessInstructions = (repo: Repository) => {
        return {
            gitClone: `git clone ${repo.cloneUrl}`,
            gitPull: `git pull origin main`,
            gitPush: `git push origin main`,
            note: "Use these commands in your terminal. Web interface access is restricted for security."
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading your repositories...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                    <div className="text-red-400">⚠️</div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error loading repositories</h3>
                        <p className="mt-1 text-sm text-red-700">{error}</p>
                        <button
                            onClick={fetchRepositories}
                            className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* User Integration Status */}
            {userInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Your Git Workspace</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="font-medium">Account:</span> {userInfo.appUserEmail}
                        </div>
                        <div>
                            <span className="font-medium">Integration Status:</span>{' '}
                            <span className={userInfo.hasGiteaIntegration ? 'text-green-600' : 'text-orange-600'}>
                                {userInfo.hasGiteaIntegration ? '✅ Active' : '⏳ Pending'}
                            </span>
                        </div>
                        <div>
                            <span className="font-medium">Total Repositories:</span> {repositories.length}
                        </div>
                    </div>
                </div>
            )}

            {/* Repositories List */}
            {repositories.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">📁</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories cloned yet</h3>
                    <p className="text-gray-600">Start by searching and cloning repositories from GitHub.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Your Cloned Repositories</h3>
                    {repositories.map((repo) => {
                        const instructions = getAccessInstructions(repo);

                        return (
                            <div key={repo.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="text-lg font-medium text-gray-900">{repo.name}</h4>
                                        <p className="text-sm text-gray-600">
                                            Cloned from: <a href={repo.originalUrl} target="_blank" rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline">{repo.originalRepo}</a>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Cloned: {new Date(repo.clonedAt).toLocaleDateString()}
                                            {repo.lastSyncAt && ` • Last sync: ${new Date(repo.lastSyncAt).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${repo.status === 'connected'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {repo.status}
                                        </span>
                                        {repo.userMapping.isProperlyMapped ? (
                                            <span className="text-green-600 text-sm">✅ Mapped</span>
                                        ) : (
                                            <span className="text-orange-600 text-sm">⚠️ Check mapping</span>
                                        )}
                                    </div>
                                </div>

                                {/* Clone URL Section */}
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Git Clone URL (Click to copy)
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <code
                                            className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono cursor-pointer hover:bg-gray-50"
                                            onClick={() => handleCopyCloneUrl(repo.cloneUrl)}
                                        >
                                            {repo.cloneUrl}
                                        </code>
                                        <button
                                            onClick={() => handleCopyCloneUrl(repo.cloneUrl)}
                                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                {/* Git Instructions */}
                                <div className="border-t pt-4">
                                    <h5 className="text-sm font-medium text-gray-700 mb-2">Git Commands:</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                        <div>
                                            <span className="font-medium">Clone:</span>
                                            <code className="block bg-gray-100 p-2 rounded mt-1 font-mono">
                                                {instructions.gitClone}
                                            </code>
                                        </div>
                                        <div>
                                            <span className="font-medium">Pull updates:</span>
                                            <code className="block bg-gray-100 p-2 rounded mt-1 font-mono">
                                                {instructions.gitPull}
                                            </code>
                                        </div>
                                        <div>
                                            <span className="font-medium">Push changes:</span>
                                            <code className="block bg-gray-100 p-2 rounded mt-1 font-mono">
                                                {instructions.gitPush}
                                            </code>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2 italic">
                                        {instructions.note}
                                    </p>
                                </div>

                                {/* User Mapping Info (for debugging/admin) */}
                                {process.env.NODE_ENV === 'development' && (
                                    <details className="mt-4">
                                        <summary className="text-xs text-gray-500 cursor-pointer">
                                            Debug: User Mapping Details
                                        </summary>
                                        <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                                            {JSON.stringify(repo.userMapping, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Access Policy Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">🔐 Access Policy</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Repositories are privately hosted and accessible only via Git commands</li>
                    <li>• Web interface access is restricted for security and compliance</li>
                    <li>• Use the provided clone URLs with your preferred Git client</li>
                    <li>• All repositories are automatically mapped to your account</li>
                </ul>
            </div>
        </div>
    );
}
