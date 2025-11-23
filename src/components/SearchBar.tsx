interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

/**
 * Search bar component for filtering apps
 */
export function SearchBar({ searchQuery, setSearchQuery }: SearchBarProps) {
  return (
    <div className="search-container">
      <input
        type="text"
        className="search-input"
        placeholder="Search apps..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
      />
    </div>
  );
}
