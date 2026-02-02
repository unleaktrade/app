import { Button } from "@/app/components/ui/button";
import { motion } from "motion/react";
import { Plus, Search, LayoutDashboard, Menu, X, FileText } from "lucide-react";
import logo from "figma:asset/6d73120824de2c8c6632c71cddef1ae782b1c254.png";
import { useState } from "react";

interface NavigationProps {
  currentView: string;
  onNavigate: (view: "home" | "browse" | "my-rfqs") => void;
  onCreateRFQ: () => void;
  onQuickQuote: () => void;
}

export function Navigation({ currentView, onNavigate, onCreateRFQ, onQuickQuote }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (view: "home" | "browse" | "my-rfqs") => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => handleNavigate("home")}
            className="flex items-center space-x-2 sm:space-x-3 transition-opacity hover:opacity-80"
          >
            <img 
              src={logo} 
              alt="UnleakTrade Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10"
            />
            <span className="text-xl sm:text-2xl font-normal tracking-tight">
              <span className="text-white/60">Unleak</span>
              <span className="text-white">Trade</span>
            </span>
          </button>

          {/* Center navigation - Desktop only */}
          <div className="hidden lg:flex items-center gap-1">
            <Button
              variant={currentView === "home" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleNavigate("home")}
              className={currentView === "home" 
                ? "bg-white/10 text-white hover:bg-white/15" 
                : "text-white/70 hover:text-white hover:bg-white/5"
              }
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={currentView === "browse" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleNavigate("browse")}
              className={currentView === "browse" 
                ? "bg-white/10 text-white hover:bg-white/15" 
                : "text-white/70 hover:text-white hover:bg-white/5"
              }
            >
              <Search className="mr-2 h-4 w-4" />
              Browse RFQs
            </Button>
            <Button
              variant={currentView === "my-rfqs" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleNavigate("my-rfqs")}
              className={currentView === "my-rfqs" 
                ? "bg-white/10 text-white hover:bg-white/15" 
                : "text-white/70 hover:text-white hover:bg-white/5"
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              My RFQs
            </Button>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white hover:bg-white/5"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Action buttons - hidden on smallest screens, shown on sm+ */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                size="sm"
                onClick={onCreateRFQ}
                className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white font-medium"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                <span className="hidden md:inline">Create RFQ</span>
                <span className="md:hidden">Create</span>
              </Button>

              <Button
                size="sm"
                onClick={onQuickQuote}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium"
              >
                <Search className="mr-1.5 h-4 w-4" />
                <span className="hidden md:inline">Quick Quote</span>
                <span className="md:hidden">Quote</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="lg:hidden border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl"
        >
          <div className="mx-auto max-w-7xl px-4 py-4 space-y-2">
            {/* Navigation items */}
            <button
              onClick={() => handleNavigate("home")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === "home"
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => handleNavigate("browse")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === "browse"
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Search className="h-5 w-5" />
              <span className="font-medium">Browse RFQs</span>
            </button>
            <button
              onClick={() => handleNavigate("my-rfqs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === "my-rfqs"
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="font-medium">My RFQs</span>
            </button>

            {/* Action buttons for mobile */}
            <div className="sm:hidden pt-2 space-y-2">
              <Button
                onClick={() => {
                  onCreateRFQ();
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create RFQ
              </Button>

              <Button
                onClick={() => {
                  onQuickQuote();
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium"
              >
                <Search className="mr-2 h-4 w-4" />
                Quick Quote
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}