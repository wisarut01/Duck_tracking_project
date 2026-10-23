import { useSearchParams } from 'react-router';
import { SearchResultsScreen } from '@/screens/SearchResultsScreen';

/** /search?q=... — คำค้นอยู่ใน URL จะได้ refresh / แชร์ลิงก์ได้ (ผลค้นหามาจาก AppData → GET /search) */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  return (
    <SearchResultsScreen
      defaultQuery={params.get('q') ?? ''}
      onQueryChange={(query) => setParams(query ? { q: query } : {}, { replace: true })}
    />
  );
}
