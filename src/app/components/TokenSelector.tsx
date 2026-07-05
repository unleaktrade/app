import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ResponsiveModal } from "@/app/components/ResponsiveModal";
import { Search, ChevronDown, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import { LISTED_SPL_TOKENS, type Token } from "@/app/lib/tokens";

export type { Token } from "@/app/lib/tokens";

interface TokenSelectorProps {
  value: Token | null;
  onChange: (token: Token) => void;
  label: string;
  excludeToken?: Token | null;
}

export function TokenSelector({ value, onChange, label, excludeToken }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<"listed" | "unlisted">("listed");

  // Unlisted token form state
  const [customMint, setCustomMint] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDecimals, setCustomDecimals] = useState("9");

  const filteredTokens = LISTED_SPL_TOKENS.filter(
    (token) =>
      token.mint !== excludeToken?.mint &&
      (token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.mint.toLowerCase().includes(searchQuery.toLowerCase())),
  ).sort((a, b) => a.symbol.localeCompare(b.symbol));

  const handleSelectListed = (token: Token) => {
    onChange(token);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleAddCustomToken = () => {
    if (!customMint || !customSymbol || !customDecimals) {
      return;
    }

    const customToken: Token = {
      symbol: customSymbol.toUpperCase(),
      name: customName || customSymbol,
      mint: customMint,
      decimals: parseInt(customDecimals),
      isCustom: true,
    };

    onChange(customToken);
    setIsOpen(false);

    // Reset form
    setCustomMint("");
    setCustomSymbol("");
    setCustomName("");
    setCustomDecimals("9");
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full justify-between bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white h-auto py-3 px-4"
        variant="outline"
      >
        {value ? (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${
                value.isCustom
                  ? "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30"
                  : "from-purple-500/20 to-blue-500/20 border-white/10"
              } flex items-center justify-center border`}
            >
              <span className="text-sm font-bold">{value.symbol[0]}</span>
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{value.symbol}</span>
                {value.isCustom && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    UNLISTED
                  </span>
                )}
              </div>
              <span className="text-xs text-white/50">{value.name}</span>
            </div>
          </div>
        ) : (
          <span className="text-white/50">{label}</span>
        )}
        <ChevronDown className="h-4 w-4 text-white/50" />
      </Button>

      <ResponsiveModal
        open={isOpen}
        onOpenChange={setIsOpen}
        title={label}
        description="Select from listed SPL tokens or enter an unlisted token address"
        contentClassName="max-w-md"
      >
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "listed" | "unlisted")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger
              value="listed"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
            >
              Listed Tokens
            </TabsTrigger>
            <TabsTrigger
              value="unlisted"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
            >
              <Plus className="h-4 w-4 mr-1" />
              Unlisted
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listed" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search by name, symbol, or mint address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-1">
              <AnimatePresence>
                {filteredTokens.map((token, index) => (
                  <motion.button
                    key={token.mint}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => handleSelectListed(token)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shrink-0">
                      <span className="font-bold">{token.symbol[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{token.symbol}</div>
                      <div className="text-sm text-white/50 truncate">{token.name}</div>
                    </div>
                    <div className="text-xs text-white/30 font-mono">
                      {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>

              {filteredTokens.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  <p>No tokens found</p>
                  <p className="text-sm mt-2">Try a different search query</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="unlisted" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
              <p className="text-sm text-white/70">
                <span className="font-semibold text-cyan-300">Trade any SPL token:</span> Enter the
                mint address of any unlisted token to create an OTC deal with ZK-verified liquidity.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customMint" className="text-white/90">
                  Token Mint Address <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="customMint"
                  placeholder="Enter SPL token mint address..."
                  value={customMint}
                  onChange={(e) => setCustomMint(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customSymbol" className="text-white/90">
                    Symbol <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="customSymbol"
                    placeholder="e.g. TOKEN"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customDecimals" className="text-white/90">
                    Decimals <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="customDecimals"
                    type="number"
                    placeholder="9"
                    value={customDecimals}
                    onChange={(e) => setCustomDecimals(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customName" className="text-white/90">
                  Token Name (Optional)
                </Label>
                <Input
                  id="customName"
                  placeholder="e.g. My Custom Token"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <Button
                onClick={handleAddCustomToken}
                disabled={!customMint || !customSymbol || !customDecimals}
                className="w-full bg-gradient-to-r from-cyan-500 via-cyan-600 to-cyan-700 hover:from-cyan-600 hover:via-cyan-700 hover:to-cyan-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Unlisted Token
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </ResponsiveModal>
    </>
  );
}
