import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
     const { searchParams } = new URL(request.url);
     const owner = searchParams.get("owner");
     const repo = searchParams.get("repo");

     if (!owner || !repo) {
          return NextResponse.json(
               { error: "Owner and repo parameters are required" },
               { status: 400 }
          );
     }

     try {
          const githubToken = process.env.GITHUB_TOKEN;
          const headers: Record<string, string> = {
               "Accept": "application/vnd.github.v3.raw",
               "User-Agent": "GitGenie-App",
          };

          // Add authorization header if token is available
          if (githubToken && githubToken !== "ghp_your_token_here") {
               headers["Authorization"] = `token ${githubToken}`;
          }

          const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;

          const response = await fetch(apiUrl, {
               headers,
          });

          if (!response.ok) {
               if (response.status === 404) {
                    return NextResponse.json(
                         { error: "No README file found in this repository" },
                         { status: 404 }
                    );
               }

               if (response.status === 403) {
                    return NextResponse.json(
                         { error: "README access limited due to API rate limits. Please try again later." },
                         { status: 429 }
                    );
               }

               const errorText = await response.text();
               console.error("GitHub README API Error:", response.status, response.statusText, errorText);

               return NextResponse.json(
                    { error: `Unable to load README: ${response.status} ${response.statusText}` },
                    { status: response.status }
               );
          }

          const readmeText = await response.text();

          // Process the README content
          let processedContent = readmeText.trim();

          // Remove excessive whitespace and normalize line endings
          processedContent = processedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

          // If content is too long, truncate it intelligently
          if (processedContent.length > 1500) {
               // Try to truncate at a line break near the limit
               const truncateAt = processedContent.lastIndexOf('\n', 1500);
               if (truncateAt > 1000) {
                    processedContent = processedContent.substring(0, truncateAt) + "\n\n... (README truncated)";
               } else {
                    processedContent = processedContent.substring(0, 1500) + "\n\n... (README truncated)";
               }
          }

          return NextResponse.json({ content: processedContent });
     } catch (error) {
          console.error("README API error:", error);
          return NextResponse.json(
               { error: "Failed to load README - please check your internet connection" },
               { status: 500 }
          );
     }
}
