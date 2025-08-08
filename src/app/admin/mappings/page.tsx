"use client";

import Link from "next/link";
import { useRequireAuth } from "../../../hooks/useSession";
import { LogoutButton } from "../../../components/LogoutButton";
import { UserProfile } from "../../../components/UserProfile";
import UserRepositoryMappings from "../../../components/dashboard/UserRepositoryMappings";

// Simple sidebar component for admin pages
const AdminSidebar = () => {
    return (
        <div className="w-64 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-r border-white/20 dark:border-gray-700/20">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Admin Panel
                </h2>

                <nav>
                    <ul className="space-y-2">
                        <li>
                            <Link
                                href="/dashboard"
                                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <span className="font-medium">Search Repositories</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/admin/mappings"
                                className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                <span className="font-medium">User Mappings</span>
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
};

export default function AdminMappings() {
    const { session, isLoading } = useRequireAuth("/login");

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
            <div className="flex h-screen">
                {/* Sidebar */}
                <AdminSidebar />

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-b border-white/20 dark:border-gray-700/20 p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Admin: User Repository Mappings
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    Manage and monitor user-repository relationships in Gitea
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <UserProfile />
                                <LogoutButton />
                            </div>
                        </div>
                    </header>

                    {/* Content */}
                    <main className="flex-1 overflow-auto p-6">
                        <div className="max-w-full">
                            {/* Warning Notice */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800">
                                            Important Security Notice
                                        </h3>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <p>
                                                This page shows how your Next.js app users are mapped to Gitea users.
                                                Users cannot access the Gitea web interface at{" "}
                                                <code className="bg-yellow-100 px-1 rounded">http://34.0.3.6:3000/</code>{" "}
                                                directly. All repository management is handled through GitGenie.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Architecture Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <h3 className="text-sm font-medium text-blue-800 mb-2">
                                    System Architecture (Email-based Mapping)
                                </h3>
                                <div className="text-sm text-blue-700 space-y-1">
                                    <p>• <strong>Next.js App Users:</strong> Authenticated via NextAuth (Google, GitHub, Credentials)</p>
                                    <p>• <strong>Gitea Users:</strong> Automatically created backend accounts for repository hosting</p>
                                    <p>• <strong>User Mapping:</strong> Based on email addresses - no stored giteaUserId/giteaUsername</p>
                                    <p>• <strong>Cloud SQL:</strong> Stores user authentication data in `infoDB` database</p>
                                    <p>• <strong>Gitea Database:</strong> Separate database for Gitea server data</p>
                                    <p>• <strong>Security:</strong> Users cannot access Gitea web interface directly</p>
                                </div>
                            </div>

                            {/* Mappings Component */}
                            <UserRepositoryMappings />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
