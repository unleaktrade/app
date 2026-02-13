import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import {
  Wallet,
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import logo from "figma:asset/6d73120824de2c8c6632c71cddef1ae782b1c254.png";

interface WalletConnectProps {
  onConnect: () => void;
}

export function WalletConnect({
  onConnect,
}: WalletConnectProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white dark relative overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <motion.img
            src={logo}
            alt="UnleakTrade Logo"
            className="h-24 w-24 sm:h-32 sm:w-32 mx-auto mb-6"
            animate={{
              filter: [
                "drop-shadow(0 0 20px rgba(168, 85, 247, 0.4))",
                "drop-shadow(0 0 30px rgba(59, 130, 246, 0.6))",
                "drop-shadow(0 0 20px rgba(34, 211, 238, 0.4))",
                "drop-shadow(0 0 20px rgba(168, 85, 247, 0.4))",
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight mb-4">
            <span className="text-white/60">Unleak</span>
            <span className="text-white">Trade</span>
          </h1>
          <p className="text-base sm:text-lg text-white/60 max-w-md mx-auto">
            Zero-Knowledge OTC Trading on Solana
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/20 via-blue-500/20 to-cyan-400/20 blur-xl" />

            <div className="relative z-10">
              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-semibold mb-3">
                  Connect Your Wallet
                </h2>
                <p className="text-white/60 text-sm">
                  Access your private OTC trading desk
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                    <Shield className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white/90">
                      Zero-Knowledge Privacy
                    </div>
                    <div className="text-sm text-white/50">
                      Trade confidentially with ZK proofs
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <Zap className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white/90">
                      Lightning Fast
                    </div>
                    <div className="text-sm text-white/50">
                      Powered by Solana's speed
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-cyan-400/20 border border-cyan-400/30">
                    <Sparkles className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white/90">
                      Professional Grade
                    </div>
                    <div className="text-sm text-white/50">
                      Built for whales and pro traders
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Connect Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  onClick={onConnect}
                  size="lg"
                  className="w-full relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 hover:from-purple-700 hover:via-blue-600 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/30 font-semibold text-lg py-6 border-0"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400"
                    animate={{
                      opacity: [0, 0.5, 0],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <Wallet className="h-6 w-6 mr-3 relative z-10" />
                  <span className="relative z-10">
                    Connect Wallet
                  </span>
                </Button>
              </motion.div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs"></div>
              </div>

              {/* Back to Landing Page */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <a
                  href="https://unleak.trade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white/70 hover:text-white text-sm font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Landing Page
                </a>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center"
        >
          <p className="text-xs text-white/30">
            By connecting, you agree to our Terms of Service and
            Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}