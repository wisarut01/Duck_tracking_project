import { useEffect, useState } from 'react';

/** ค่าที่ "ตามทัน" value หลังหยุดเปลี่ยนไป delayMs — ใช้กับช่องค้นหา จะได้ไม่ยิง API ทุกตัวอักษร */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
