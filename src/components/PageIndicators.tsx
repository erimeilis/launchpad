import { Button } from "./ui/Button";

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
    <div className="flex justify-center gap-2 py-5">
      {Array.from({ length: totalPages }).map((_, index) => (
        <Button
          key={index}
          variant="unstyled"
          className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-200 ${
            index === currentPage
              ? "bg-white scale-125"
              : "bg-white/40 hover:bg-white/60"
          }`}
          onClick={() => setCurrentPage(index)}
          title={`Page ${index + 1}`}
        />
      ))}
    </div>
  );
}
