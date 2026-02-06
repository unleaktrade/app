import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { 
  Plus, 
  Menu, 
  X, 
  TrendingUp, 
  Activity, 
  Store,
  FileText,
  MousePointerClick,
  HandCoins,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import logo from "figma:asset/6d73120824de2c8c6632c71cddef1ae782b1c254.png";

interface MainNavbarProps {
  currentView: "marketplace" | "my-rfqs" | "my-quotes" | "my-earnings";
  onNavigate: (view: "marketplace" | "my-rfqs" | "my-quotes" | "my-earnings") => void;
  onCreateRFQ: () => void;
}

export function MainNavbar({ currentView, onNavigate, onCreateRFQ }: MainNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { 
      id: "marketplace" as const, 
      label: "Marketplace",
      icon: Store,
      description: "Browse and quote RFQs"
    },
    { 
      id: "my-rfqs" as const, 
      label: "My RFQs",
      icon: FileText,
      description: "Manage your requests"
    },
    { 
      id: "my-quotes" as const, 
      label: "My Quotes",
      icon: MousePointerClick,
      description: "Track submitted quotes"
    },
    { 
      id: "my-earnings" as const, 
      label: "My Earnings",
      icon: HandCoins,
      description: "View your rewards"
    },
  ];

  const handleNavigate = (view: "marketplace" | "my-rfqs" | "my-quotes" | "my-earnings") => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const handleCreateRFQ = () => {
    onCreateRFQ();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4 sm:gap-8">
              <button
                onClick={() => handleNavigate("marketplace")}
                className="flex items-center gap-2 sm:gap-3 group transition-opacity hover:opacity-80 relative z-10"
              >
                <img 
                  src={logo} 
                  alt="UnleakTrade Logo" 
                  className="h-8 w-8 sm:h-10 sm:w-10"
                />
                <span className="text-lg sm:text-xl lg:text-2xl font-normal tracking-tight">
                  <span className="text-white/60">Unleak</span>
                  <span className="text-white">Trade</span>
                </span>
              </button>

              {/* Desktop Navigation Links with Icons */}
              <div className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  // Color system: Purple for Maker, Blue for Taker, Cyan for Marketplace, Green for Earnings
                  const getActiveColor = () => {
                    if (item.id === "my-rfqs") return "from-purple-500/20 to-purple-600/20 border-purple-500/30";
                    if (item.id === "my-quotes") return "from-blue-500/20 to-blue-600/20 border-blue-500/30";
                    if (item.id === "my-earnings") return "from-green-500/20 to-emerald-500/20 border-green-500/30";
                    return "from-cyan-500/20 to-blue-500/20 border-cyan-500/30"; // marketplace
                  };
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {currentView === item.id && (
                        <motion.div
                          layoutId="activeNav"
                          className={`absolute inset-0 bg-gradient-to-r ${getActiveColor()} border rounded-lg`}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span
                        className={`relative flex items-center gap-2 ${
                          currentView === item.id
                            ? "text-white"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop: Create Button | Mobile/Tablet: Hamburger Only */}
            <div className="flex items-center gap-3 relative z-10">
              {/* Create RFQ Button - Desktop Only - PURPLE gradient for Maker */}
              <Button
                onClick={handleCreateRFQ}
                size="sm"
                className="hidden lg:flex bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/30"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create RFQ
              </Button>

              {/* Hamburger Menu Button - Mobile/Tablet Only */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                aria-label="Toggle menu"
              >
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-5 w-5 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="h-5 w-5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
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
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Slide-in Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-16 right-0 bottom-0 w-full max-w-sm bg-[#0a0a0f]/98 backdrop-blur-xl border-l border-white/10 z-40 lg:hidden overflow-y-auto"
            >
              <div className="p-6 space-y-4">
                {/* Create RFQ Button - Prominent */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <Button
                    onClick={handleCreateRFQ}
                    size="lg"
                    className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/30 font-semibold"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create RFQ
                  </Button>
                </motion.div>

                {/* Divider */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="border-t border-white/10"
                />

                {/* Navigation Items with Icons and Descriptions */}
                <div className="space-y-2">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    // Color system: Purple for Maker, Blue for Taker, Cyan for Marketplace, Green for Earnings
                    const getActiveMobileColor = () => {
                      if (item.id === "my-rfqs") return {
                        bg: "from-purple-500/20 to-purple-600/10 border-purple-500/30 shadow-purple-500/10",
                        iconBg: "bg-purple-500/20",
                        iconColor: "text-purple-400",
                        chevronColor: "text-purple-400"
                      };
                      if (item.id === "my-quotes") return {
                        bg: "from-blue-500/20 to-blue-600/10 border-blue-500/30 shadow-blue-500/10",
                        iconBg: "bg-blue-500/20",
                        iconColor: "text-blue-400",
                        chevronColor: "text-blue-400"
                      };
                      if (item.id === "my-earnings") return {
                        bg: "from-green-500/20 to-emerald-500/10 border-green-500/30 shadow-green-500/10",
                        iconBg: "bg-green-500/20",
                        iconColor: "text-green-400",
                        chevronColor: "text-green-400"
                      };
                      return {
                        bg: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 shadow-cyan-500/10",
                        iconBg: "bg-cyan-500/20",
                        iconColor: "text-cyan-400",
                        chevronColor: "text-cyan-400"
                      };
                    };
                    
                    const activeColors = getActiveMobileColor();
                    
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 + 0.15 }}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full px-5 py-4 rounded-xl text-left transition-all group ${
                          currentView === item.id
                            ? `bg-gradient-to-r ${activeColors.bg} border shadow-lg`
                            : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              currentView === item.id
                                ? activeColors.iconBg
                                : "bg-white/10 group-hover:bg-white/20"
                            }`}>
                              <Icon className={`h-5 w-5 ${
                                currentView === item.id
                                  ? activeColors.iconColor
                                  : "text-white/60 group-hover:text-white"
                              }`} />
                            </div>
                            <div>
                              <div className={`font-semibold ${
                                currentView === item.id
                                  ? "text-white"
                                  : "text-white/80 group-hover:text-white"
                              }`}>
                                {item.label}
                              </div>
                              <div className="text-xs text-white/40 mt-0.5">
                                {item.description}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className={`h-5 w-5 transition-transform ${
                            currentView === item.id
                              ? `${activeColors.chevronColor} translate-x-0`
                              : "text-white/30 -translate-x-1 group-hover:translate-x-0 group-hover:text-white/60"
                          }`} />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Divider */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="border-t border-white/10"
                />

                {/* Quick Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <div className="text-xs text-white/40 uppercase tracking-wider font-semibold px-2">
                    Quick Stats
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 backdrop-blur-sm border border-green-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-green-500/20">
                          <Activity className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <div className="text-xs text-white/50">Active</div>
                      </div>
                      <div className="text-2xl font-bold text-white">12</div>
                      <div className="text-xs text-green-400 mt-0.5">RFQs</div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-cyan-500/20">
                          <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                        </div>
                        <div className="text-xs text-white/50">Volume</div>
                      </div>
                      <div className="text-2xl font-bold text-white">$4.7M</div>
                      <div className="text-xs text-cyan-400 mt-0.5">24h</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}