import NavbarWrapper from "@/components/NavbarWrapper";
import FooterWrapper from "@/components/FooterWrapper";
import ViewportFix from "@/components/ViewportFix";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#1A1A1A]">
      <ViewportFix />
      <NavbarWrapper />
      <main className="flex-grow w-full flex flex-col">
        {children}
      </main>
      <FooterWrapper />
    </div>
  );
}
