import { Button } from "@/app/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "figma:asset/6d73120824de2c8c6632c71cddef1ae782b1c254.png";

interface NavigationProps {
  currentView: string;
  onNavigate: (view: "home" | "marketplace" | "my-rfqs" | "my-quotes") => void;
  onCreateRFQ: () => void;
  onQuickQuote: () => void;
}

export function Navigation({ currentView, onNavigate, onCreateRFQ }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "marketplace", label: "Marketplace" },
    { id: "my-rfqs", label: "My RFQs" },
    { id: "my-quotes", label: "My Quotes" },
  ];

  const handleNavigate = (view: "home" | "marketplace" | "my-rfqs" | "my-quotes") => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <>
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
              className="flex items-center space-x-2 sm:space-x-3 transition-opacity hover:opacity-80 relative z-10"
            >
              <img 
                src={logo} 
                alt="UnleakTrade Logo" 
                className="h-8 w-8 sm:h-10 sm:w-10"
              />
              <span className="text-xl sm:text-2xl font-normal tracking-tight hidden sm:inline-block">
                <span className="text-white/60">Unleak</span>
                <span className="text-white">Trade</span>
              </span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id as any)}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentView === item.id
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right side - Hamburger (Mobile) + Create Button */}
            <div className="flex items-center gap-3 relative z-10">
              {/* Create RFQ Button */}
              <Button
                size="sm"
                onClick={onCreateRFQ}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/20"
              >
                <Plus className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Create RFQ</span>
              </Button>

              {/* Hamburger Menu Button - Mobile Only */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-white" />
                ) : (
                  <Menu className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Slide-in Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-16 right-0 bottom-0 w-80 bg-[#0a0a0f]/95 backdrop-blur-xl border-l border-white/10 z-40 lg:hidden overflow-y-auto"
            >
              <div className="p-6 space-y-2">
                {navItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNavigate(item.id as any)}
                    className={`w-full px-6 py-4 rounded-xl text-left font-semibold transition-all ${
                      currentView === item.id
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {item.label}
                  </motion.button>
                ))}

                {/* Divider */}
                <div className="my-6 border-t border-white/10" />

                {/* Additional Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-4"
                >
                  <div className="text-sm text-white/50 mb-2">Active RFQs</div>
                  <div className="text-2xl font-bold text-white">12</div>
                  <div className="text-xs text-cyan-400 mt-1">3 need attention</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-4"
                >
                  <div className="text-sm text-white/50 mb-2">Total Volume (24h)</div>
                  <div className="text-2xl font-bold text-white">$4.7M</div>
                  <div className="text-xs text-green-400 mt-1">+18.2% vs yesterday</div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
