interface PageIndicatorsProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
}

/**
 * Page navigation dots displayed at the bottom of the screen
 */
export function PageIndicators({ currentPage, totalPages, setCurrentPage }: PageIndicatorsProps) {
  return (
    <div className="page-indicators">
      {Array.from({ length: totalPages }).map((_, index) => (
        <button
          key={index}
          className={`page-dot ${index === currentPage ? "active" : ""}`}
          onClick={() => setCurrentPage(index)}
          aria-label={`Page ${index + 1}`}
        />
      ))}
    </div>
  );
}
