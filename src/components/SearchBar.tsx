import { useTranslation } from "react-i18next";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

/**
 * Search bar component for filtering apps
 */
export function SearchBar({ searchQuery, setSearchQuery }: SearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 flex justify-center">
      <input
        type="text"
        className="w-[300px] px-4 py-2.5 text-base text-white rounded-xl border-none bg-white/10 backdrop-blur-[40px] outline-none transition-all duration-200 placeholder:text-white/50 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.2)]"
        placeholder={t("search.placeholder")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
      />
    </div>
  );
}
