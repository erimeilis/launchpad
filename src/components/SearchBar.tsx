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
    <div className="search-container">
      <input
        type="text"
        className="search-input"
        placeholder={t("search.placeholder")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
      />
    </div>
  );
}
