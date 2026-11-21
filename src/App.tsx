import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const path = typeof window === "undefined" ? "/" : window.location.pathname;
const route = (base && path.startsWith(base) ? path.slice(base.length) : path) || "/";
const isHome = route === "/" || route === "";

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Sonner position="bottom-right" closeButton />
      {isHome ? <Index /> : <NotFound />}
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
