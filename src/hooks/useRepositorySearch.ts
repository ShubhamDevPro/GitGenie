import { useState, useRef } from "react";
import { Repository } from "../types/repository";

// Types
interface GitHubApiResponse {
     total_count: number;
     items: Repository[];
}

interface OverrideFilters {
     language?: string;
     dateRange?: string;
     sortBy?: string;
     orderBy?: string;
}

export const useRepositorySearch = () => {
     // State
     const [searchQuery, setSearchQuery] = useState("");
     const [repositories, setRepositories] = useState<Repository[]>([]);
     const [isLoading, setIsLoading] = useState(false);
     const [error, setError] = useState("");
     const [totalCount, setTotalCount] = useState(0);
     const [currentPage, setCurrentPage] = useState(1);
     const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
     const [readme, setReadme] = useState("");
     const [readmeLoading, setReadmeLoading] = useState(false);

     // Filter states
     const [selectedLanguage, setSelectedLanguage] = useState("");
     const [sortBy, setSortBy] = useState("stars");
     const [orderBy, setOrderBy] = useState("desc");
     const [dateRange, setDateRange] = useState("");
     const [showFilters, setShowFilters] = useState(false);

     // Request tracking
     const currentRequestRef = useRef<number>(0);
     const currentReadmeRequestRef = useRef<number>(0);

     const searchRepositories = async (
          query: string,
          page: number = 1,
          overrideFilters?: OverrideFilters
     ) => {
          // Use override filters if provided, otherwise use current state
          const effectiveLanguage = overrideFilters?.language ?? selectedLanguage;
          const effectiveDateRange = overrideFilters?.dateRange ?? dateRange;
          const effectiveSortBy = overrideFilters?.sortBy ?? sortBy;
          const effectiveOrderBy = overrideFilters?.orderBy ?? orderBy;

          // Validate sort parameters for GitHub API
          const validSortValues = ["stars", "forks", "updated"];
          const validOrderValues = ["asc", "desc"];

          const finalSortBy = validSortValues.includes(effectiveSortBy)
               ? effectiveSortBy
               : "stars";
          const finalOrderBy = validOrderValues.includes(effectiveOrderBy)
               ? effectiveOrderBy
               : "desc";

          // If no query and no filters, don't search
          if (!query.trim() && !effectiveLanguage && !effectiveDateRange) return;

          // Cancel any previous request and create new request ID
          const requestId = ++currentRequestRef.current;

          setIsLoading(true);
          setError("");

          // Add a delay to help avoid rapid API calls, longer delay for pagination
          const delay = page > 1 ? 500 : 200;
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Check if this request was cancelled
          if (requestId !== currentRequestRef.current) {
               return;
          }

          try {
               // Build search query with filters
               let searchQuery = query.trim() || "stars:>1";

               // Add language filter
               if (effectiveLanguage) {
                    if (query.trim()) {
                         searchQuery += ` language:${effectiveLanguage}`;
                    } else {
                         searchQuery = `language:${effectiveLanguage}`;
                    }
               }

               // Add date range filter
               if (effectiveDateRange) {
                    const now = new Date();
                    let dateFilter = "";

                    switch (effectiveDateRange) {
                         case "day":
                              const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                              dateFilter = `pushed:>=${dayAgo.toISOString().split("T")[0]}`;
                              break;
                         case "week":
                              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                              dateFilter = `pushed:>=${weekAgo.toISOString().split("T")[0]}`;
                              break;
                         case "month":
                              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                              dateFilter = `pushed:>=${monthAgo.toISOString().split("T")[0]}`;
                              break;
                         case "year":
                              const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                              dateFilter = `pushed:>=${yearAgo.toISOString().split("T")[0]}`;
                              break;
                    }

                    if (dateFilter) {
                         searchQuery += ` ${dateFilter}`;
                    }
               }

               // Retry logic for API requests
               const maxRetries = 2;

               for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                         const apiUrl = `/api/github/search?q=${encodeURIComponent(
                              searchQuery
                         )}&sort=${finalSortBy}&order=${finalOrderBy}&per_page=10&page=${page}`;

                         const response = await fetch(apiUrl);

                         if (!response.ok) {
                              const errorData = await response.json();
                              console.error(
                                   "API Error:",
                                   response.status,
                                   response.statusText,
                                   errorData
                              );

                              // Handle specific error cases
                              if (response.status === 429) {
                                   // For rate limiting, wait longer before retry
                                   if (attempt < maxRetries) {
                                        await new Promise((resolve) =>
                                             setTimeout(resolve, (attempt + 1) * 2000)
                                        );
                                        continue;
                                   }
                                   throw new Error(
                                        errorData.error || "GitHub API rate limit reached. Please wait a moment and try again."
                                   );
                              } else if (response.status === 422) {
                                   throw new Error(
                                        "Invalid search query. Please check your search terms and try again."
                                   );
                              } else if (response.status >= 500) {
                                   throw new Error(
                                        "GitHub is experiencing issues. Please try again in a moment."
                                   );
                              } else {
                                   throw new Error(
                                        errorData.error || `GitHub API error: ${response.status} ${response.statusText}`
                                   );
                              }
                         }

                         const data: GitHubApiResponse = await response.json();

                         // Check if this request was cancelled
                         if (requestId !== currentRequestRef.current) {
                              return;
                         }

                         setRepositories(data.items);
                         setTotalCount(data.total_count);
                         setError("");
                         return;
                    } catch (error) {
                         if (attempt === maxRetries) {
                              throw error;
                         }
                         await new Promise((resolve) =>
                              setTimeout(resolve, (attempt + 1) * 1000)
                         );
                    }
               }
          } catch (error) {
               // Check if this request was cancelled
               if (requestId !== currentRequestRef.current) {
                    return;
               }

               console.error("Search error:", error);
               setError(
                    `Failed to search repositories: ${error instanceof Error ? error.message : "Unknown error"
                    }`
               );
          } finally {
               // Only clear loading if this is still the current request
               if (requestId === currentRequestRef.current) {
                    setIsLoading(false);
               }
          }
     };

     const fetchReadme = async (owner: string, repo: string) => {
          // Cancel any previous README request and create new request ID
          const requestId = ++currentReadmeRequestRef.current;

          setReadmeLoading(true);
          setReadme(""); // Clear previous README content

          try {
               // Use our API route instead of direct GitHub API call
               const apiUrl = `/api/github/readme?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;

               const response = await fetch(apiUrl);

               // Check if this request was cancelled
               if (requestId !== currentReadmeRequestRef.current) {
                    return;
               }

               if (response.ok) {
                    const data = await response.json();

                    // Check again if this request was cancelled
                    if (requestId !== currentReadmeRequestRef.current) {
                         return;
                    }

                    setReadme(data.content);
               } else {
                    const errorData = await response.json();
                    console.error("README fetch error:", response.status, response.statusText, errorData);
                    setReadme(errorData.error || "Unable to load README at this time");
               }
          } catch (error) {
               // Check if this request was cancelled
               if (requestId !== currentReadmeRequestRef.current) {
                    return;
               }
               console.error("README fetch error:", error);
               setReadme("Failed to load README - please check your internet connection");
          } finally {
               // Only clear loading if this is still the current request
               if (requestId === currentReadmeRequestRef.current) {
                    setReadmeLoading(false);
               }
          }
     }; const handleSearch = (e: React.FormEvent) => {
          e.preventDefault();
          setCurrentPage(1);
          searchRepositories(searchQuery, 1);
     };

     const resetFilters = () => {
          setSelectedLanguage("");
          setSortBy("stars");
          setOrderBy("desc");
          setDateRange("");
          setCurrentPage(1);
          if (searchQuery) {
               searchRepositories(searchQuery, 1);
          } else {
               setRepositories([]);
               setTotalCount(0);
          }
     };

     const handlePageChange = (page: number) => {
          const maxPages = Math.min(Math.ceil(totalCount / 10), 100);
          if (page >= 1 && page <= maxPages) {
               setCurrentPage(page);
               const queryToUse =
                    searchQuery || (selectedLanguage || dateRange ? "popular" : "");
               searchRepositories(queryToUse, page);
               window.scrollTo({ top: 0, behavior: "smooth" });
          }
     };

     const handleRepoClick = (repo: Repository) => {
          setSelectedRepo(repo);
          setReadme("");
          setReadmeLoading(true);
          fetchReadme(repo.owner.login, repo.name);
     };

     const retryReadme = () => {
          if (selectedRepo) {
               fetchReadme(selectedRepo.owner.login, selectedRepo.name);
          }
     };

     return {
          // State
          searchQuery,
          setSearchQuery,
          repositories,
          isLoading,
          error,
          totalCount,
          currentPage,
          selectedRepo,
          readme,
          readmeLoading,
          selectedLanguage,
          setSelectedLanguage,
          sortBy,
          setSortBy,
          orderBy,
          setOrderBy,
          dateRange,
          setDateRange,
          showFilters,
          setShowFilters,
          setCurrentPage,
          setRepositories,
          setTotalCount,

          // Functions
          searchRepositories,
          fetchReadme,
          handleSearch,
          resetFilters,
          handlePageChange,
          handleRepoClick,
          retryReadme,
     };
};
