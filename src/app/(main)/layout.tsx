import AuthGuard from '@/components/layout/AuthGuard';
import Header from '@/components/layout/Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <Header />
            <main>{children}</main>
        </AuthGuard>
    );
}
