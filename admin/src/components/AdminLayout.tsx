import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AdminLayout({ title, subtitle, children }: Props) {
  return (
    <div style={styles.wrapper} dir="rtl">
      <AdminSidebar />
      <div style={styles.main}>
        <AdminHeader title={title} subtitle={subtitle} />
        <main style={styles.content}>{children}</main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "'Cairo', 'Tajawal', 'Segoe UI', sans-serif",
  },
  main: {
    marginRight: 280,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  content: {
    flex: 1,
    padding: "32px",
  },
};