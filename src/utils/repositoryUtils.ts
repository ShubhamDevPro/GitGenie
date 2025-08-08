// Date formatting utility
export const formatDate = (dateString: string) => {
     const date = new Date(dateString);
     const now = new Date();
     const diffInDays = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
     );

     if (diffInDays === 0) {
          return "Today";
     } else if (diffInDays === 1) {
          return "Yesterday";
     } else if (diffInDays < 7) {
          return `${diffInDays} days ago`;
     } else if (diffInDays < 30) {
          const weeks = Math.floor(diffInDays / 7);
          return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
     } else if (diffInDays < 365) {
          const months = Math.floor(diffInDays / 30);
          return `${months} month${months > 1 ? "s" : ""} ago`;
     } else {
          const years = Math.floor(diffInDays / 365);
          return `${years} year${years > 1 ? "s" : ""} ago`;
     }
};

// Description formatting utility
export const formatDescription = (description: string | null): string => {
     if (!description) {
          return "No description available";
     }

     // Trim whitespace and check if it's effectively empty
     const trimmedDescription = description.trim();

     if (trimmedDescription === "") {
          return "No description available";
     }

     // Check if description is just placeholder text or very short
     if (trimmedDescription.length < 3) {
          return "No description available";
     }

     // Check for common placeholder patterns
     const placeholderPatterns = [
          /^\.+$/, // Only dots
          /^-+$/, // Only dashes
          /^_+$/, // Only underscores
          /^##+$/, // Only hashtags
          /^todo$/i, // Just "todo"
          /^tbd$/i, // "To be determined"
          /^wip$/i, // "Work in progress"
          /^n\/a$/i, // "Not applicable"
          /^none$/i, // "None"
          /^empty$/i, // "Empty"
          /^null$/i, // "Null"
          /^undefined$/i, // "Undefined"
          /^test$/i, // "Test"
          /^example$/i, // "Example"
          /^sample$/i, // "Sample"
          /^placeholder$/i, // "Placeholder"
          /^description$/i, // "Description"
          /^untitled$/i, // "Untitled"
     ];

     for (const pattern of placeholderPatterns) {
          if (pattern.test(trimmedDescription)) {
               return "No description available";
          }
     }

     // Check if it's just repeated characters
     const repeatedCharPattern = /^(.)\1{2,}$/;
     if (repeatedCharPattern.test(trimmedDescription)) {
          return "No description available";
     }

     // Check if it's just special characters without meaningful content
     const specialCharsOnly = /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~\s]+$/;
     if (specialCharsOnly.test(trimmedDescription)) {
          return "No description available";
     }

     // Clean up the description for better display
     let cleanDescription = trimmedDescription;

     // Remove excessive whitespace
     cleanDescription = cleanDescription.replace(/\s+/g, ' ');

     // Capitalize first letter if it's not already
     if (cleanDescription.length > 0 && cleanDescription[0] !== cleanDescription[0].toUpperCase()) {
          cleanDescription = cleanDescription[0].toUpperCase() + cleanDescription.slice(1);
     }

     // Ensure it ends with proper punctuation if it doesn't already
     if (cleanDescription.length > 0 && !/[.!?]$/.test(cleanDescription)) {
          // Only add period if it's not a fragment or title-like
          if (cleanDescription.length > 10 && !/^[A-Z][a-z]+$/.test(cleanDescription)) {
               cleanDescription += '.';
          }
     }

     return cleanDescription;
};

// Popular programming languages list
export const popularLanguages = [
     "JavaScript",
     "TypeScript",
     "Python",
     "Java",
     "C++",
     "C#",
     "PHP",
     "Ruby",
     "Go",
     "Rust",
     "Swift",
     "Kotlin",
     "Dart",
     "HTML",
     "CSS",
     "Vue",
     "React",
     "Angular",
     "Svelte",
     "Shell",
     "PowerShell",
];

// Pagination helper
export const generatePageNumbers = (
     currentPage: number,
     totalCount: number,
     handlePageChange: (page: number) => void
) => {
     const totalPages = Math.min(Math.ceil(totalCount / 10), 100); // Limit to 100 pages
     const pageNumbers = [];
     const showPages = 5; // Show 5 page numbers

     let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
     const endPage = Math.min(totalPages, startPage + showPages - 1);

     // Adjust if we're near the end
     if (endPage - startPage + 1 < showPages) {
          startPage = Math.max(1, endPage - showPages + 1);
     }

     // First page
     if (startPage > 1) {
          pageNumbers.push({
               type: "button",
               key: 1,
               page: 1,
               text: "1",
               onClick: () => handlePageChange(1),
          });

          if (startPage > 2) {
               pageNumbers.push({
                    type: "ellipsis",
                    key: "ellipsis1",
                    text: "...",
               });
          }
     }

     // Page numbers
     for (let i = startPage; i <= endPage; i++) {
          pageNumbers.push({
               type: "button",
               key: i,
               page: i,
               text: i.toString(),
               isActive: i === currentPage,
               onClick: () => handlePageChange(i),
          });
     }

     // Last page
     if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
               pageNumbers.push({
                    type: "ellipsis",
                    key: "ellipsis2",
                    text: "...",
               });
          }

          pageNumbers.push({
               type: "button",
               key: totalPages,
               page: totalPages,
               text: totalPages.toString(),
               onClick: () => handlePageChange(totalPages),
          });
     }

     // Add indicator if there are more than 100 pages
     if (Math.ceil(totalCount / 10) > 100) {
          pageNumbers.push({
               type: "indicator",
               key: "more-pages",
               text: "(Limited to 100 pages)",
          });
     }

     return pageNumbers;
};
