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
