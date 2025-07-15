"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 relative overflow-hidden flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -top-4 -right-4 w-96 h-96 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-r from-pink-400 to-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-6000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {mounted &&
          [...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            >
              <div className="w-1 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
            </div>
          ))}
      </div>

      {/* Header with navigation */}
      <header className="relative z-10 p-4 flex-shrink-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center transform transition-transform duration-300 hover:rotate-12">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              GitGenie
            </span>
          </div>

          <nav className="flex items-center space-x-6">
            <Link
              href="/register"
              className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300 font-medium"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-5xl mx-auto">
          {/* Main heading with animation */}
          <div className="mb-6 space-y-2">
            <h1
              className={`text-4xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 transition-all duration-1000 ${
                mounted ? "animate-fade-in-up" : "opacity-0 translate-y-10"
              }`}
            >
              Welcome to
            </h1>
            <h1
              className={`text-5xl md:text-7xl lg:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 transition-all duration-1000 delay-300 ${
                mounted ? "animate-fade-in-up" : "opacity-0 translate-y-10"
              }`}
            >
              GitGenie
            </h1>
          </div>

          {/* Supporting text */}
          <p
            className={`text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto transition-all duration-1000 delay-600 ${
              mounted ? "animate-fade-in-up" : "opacity-0 translate-y-10"
            }`}
          >
            Supercharge your development workflow with intelligent repository
            management, automated insights, and seamless collaboration tools
            that make coding magical.
          </p>

          {/* Feature highlights */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 transition-all duration-1000 delay-900 ${
              mounted ? "animate-fade-in-up" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-lg rounded-xl p-4 border border-white/20 dark:border-gray-700/20 transform transition-all duration-300 hover:scale-105 hover:bg-white/30 dark:hover:bg-gray-800/30">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Lightning Fast
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Optimized performance for seamless development experience
              </p>
            </div>

            <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-lg rounded-xl p-4 border border-white/20 dark:border-gray-700/20 transform transition-all duration-300 hover:scale-105 hover:bg-white/30 dark:hover:bg-gray-800/30">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Smart Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                AI-powered analytics to optimize your codebase
              </p>
            </div>

            <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-lg rounded-xl p-4 border border-white/20 dark:border-gray-700/20 transform transition-all duration-300 hover:scale-105 hover:bg-white/30 dark:hover:bg-gray-800/30">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Team Collaboration
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Seamless collaboration tools for distributed teams
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-1200 ${
              mounted ? "animate-fade-in-up" : "opacity-0 translate-y-10"
            }`}
          >
            <Link
              href="/register"
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-purple-500/25 text-base"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white/20 dark:bg-gray-800/20 backdrop-blur-lg border border-white/20 dark:border-gray-700/20 text-gray-900 dark:text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 hover:bg-white/30 dark:hover:bg-gray-800/30 text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-gray-500 dark:text-gray-400 flex-shrink-0">
        <p className="text-sm">
          © 2025 GitGenie. Crafted with ❤️ by Area51.
        </p>
      </footer>
    </div>
  );
}
