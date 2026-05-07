import logo from "../../imports/logo.png";

export default function Header() {
  return (
    <header className="bg-white border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Sombhabona Logo" className="h-12 w-auto" />
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <div className="px-3 py-1 bg-accent rounded-md">
              Admin Portal
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
