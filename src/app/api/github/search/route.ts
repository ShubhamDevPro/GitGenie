import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
     const { searchParams } = new URL(request.url);
     const query = searchParams.get("q");
     const sort = searchParams.get("sort") || "stars";
     const order = searchParams.get("order") || "desc";
     const page = searchParams.get("page") || "1";
     const per_page = searchParams.get("per_page") || "10";

     if (!query) {
          return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
     }

     try {
          const githubToken = process.env.GITHUB_TOKEN;
          const headers: Record<string, string> = {
               "Accept": "application/vnd.github.v3+json",
               "User-Agent": "GitGenie-App",
          };

          // Add authorization header if token is available
          if (githubToken && githubToken !== "ghp_your_token_here") {
               headers["Authorization"] = `token ${githubToken}`;
          }

          const apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(
               query
          )}&sort=${sort}&order=${order}&per_page=${per_page}&page=${page}`;

          const response = await fetch(apiUrl, {
               headers,
          });

          if (!response.ok) {
               const errorText = await response.text();
               console.error("GitHub API Error:", response.status, response.statusText, errorText);

               if (response.status === 403) {
                    return NextResponse.json(
                         { error: "GitHub API rate limit reached. Please try again later." },
                         { status: 429 }
                    );
               }

               return NextResponse.json(
                    { error: `GitHub API error: ${response.status} ${response.statusText}` },
                    { status: response.status }
               );
          }

          const data = await response.json();
          return NextResponse.json(data);
     } catch (error) {
          console.error("Search API error:", error);
          return NextResponse.json(
               { error: "Failed to search repositories" },
               { status: 500 }
          );
     }
}
