/**
 * Next.js App Router Template untuk rute (dashboard).
 * 
 * Pass-through wrapper murni:
 * - Menghilangkan animasi opacity/transform global di parent yang memicu bug compositor
 *   Chromium (mematikan backdrop-filter kaca es selama transisi).
 * - Seluruh animasi cascading entrance dikelola secara berjenjang (staggered)
 *   langsung oleh masing-masing kartu dan komponen anak.
 */
export default function DashboardTemplate({ children }) {
  return <div className="w-full">{children}</div>;
}
