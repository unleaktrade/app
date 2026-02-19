import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Search, ChevronDown, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";

export interface Token {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
  isCustom?: boolean;
}

// SPL Tokens listed on Pyth Network (excluding native SOL)
const LISTED_SPL_TOKENS: Token[] = [
  // Liquid Staking Tokens
  {
    symbol: "MSOL",
    name: "Marinade Staked SOL",
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    decimals: 9,
  },
  {
    symbol: "BSOL",
    name: "BlazeStake SOL",
    mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    decimals: 9,
  },
  {
    symbol: "SSOL",
    name: "Sanctum SOL",
    mint: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
    decimals: 9,
  },
  {
    symbol: "JUPSOL",
    name: "Jupiter Staked SOL",
    mint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
    decimals: 9,
  },
  // DeFi Tokens
  {
    symbol: "INF",
    name: "Infinity",
    mint: "5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF",
    decimals: 9,
  },
  {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 6,
  },
  {
    symbol: "MEW",
    name: "Cat in a Dogs World",
    mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    decimals: 5,
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
  },
  {
    symbol: "PYTH",
    name: "Pyth Network",
    mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    decimals: 6,
  },
  {
    symbol: "HNT",
    name: "Helium",
    mint: "hntyVP6YFm1Hg25TN9WGLqM12b1TRezrhCEBsX82Ux6",
    decimals: 8,
  },
  {
    symbol: "ORCA",
    name: "Orca",
    mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    decimals: 6,
  },
  {
    symbol: "SAMO",
    name: "Samoyedcoin",
    mint: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    decimals: 9,
  },
  {
    symbol: "MNDE",
    name: "Marinade",
    mint: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",
    decimals: 9,
  },
  {
    symbol: "NEON",
    name: "Neon",
    mint: "NeonTjSjsuo3rexg9o6vHuMXw62f9V7zvmu8M8Zut44",
    decimals: 9,
  },
  {
    symbol: "JLP",
    name: "Jupiter Perps LP",
    mint: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
    decimals: 6,
  },
  {
    symbol: "PENGU",
    name: "Pudgy Penguins",
    mint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
    decimals: 6,
  },
  {
    symbol: "TRUMP",
    name: "MAGA",
    mint: "HaP8r3ksG76PhQLTqR8FYBeNiQpejcFbQmiHbg787Ut1",
    decimals: 9,
  },
  {
    symbol: "FARTCOIN",
    name: "Fartcoin",
    mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
    decimals: 6,
  },
  {
    symbol: "PUMP",
    name: "Pump",
    mint: "6PLkTN5f3xdAKzDKbV9YKSvMjPfB7xH3z6T3kKpJ9s3h",
    decimals: 9,
  },
  {
    symbol: "ORE",
    name: "Ore",
    mint: "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp",
    decimals: 9,
  },
  // Stablecoins
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
  },
  {
    symbol: "CASH",
    name: "Cash",
    mint: "CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT",
    decimals: 6,
  },
  // RWA / NAV feeds
  {
    symbol: "NAV.USTB",
    name: "Backed US Treasury",
    mint: "BACKXhFBa8fGDryz2rXonVG8ncwXvGHvbMqMW5hu4fd6",
    decimals: 6,
  },
  {
    symbol: "NAV.USCC",
    name: "Backed Corporate Credit",
    mint: "CChTq6PthWU82YZkbveA3WDf7s97BWhBznwH4VBFjA6P",
    decimals: 6,
  },
  {
    symbol: "NOPAL",
    name: "Nopal",
    mint: "NoPALrDZhMK2c9FhYNqpjUsEDm6xX77gvJTiCZzfcj5",
    decimals: 6,
  },
  {
    symbol: "NTBILL",
    name: "N-T Bill",
    mint: "NTBiLLryRmKCPJPKqQzqrxhBVqK6qD4VJaqqfU7d2g5",
    decimals: 6,
  },
  {
    symbol: "NBASIS",
    name: "N-Basis",
    mint: "NBAsisMa9YEGjXKBNkVgv8HPKYpbZ7kxr6sGwkkV1LD",
    decimals: 6,
  },
  {
    symbol: "NWISDOM",
    name: "N-Wisdom",
    mint: "NWiSDoMaFoS5TcEfhXr3BNp4PUc8d1TpXhxTuBpFN1L",
    decimals: 6,
  },
  {
    symbol: "NALPHA",
    name: "N-Alpha",
    mint: "NALpHaCnPUe1vASTJ1m7P2XPdNqNj2ocsGWqzfb8Fzo",
    decimals: 6,
  },
  {
    symbol: "PST",
    name: "PST",
    mint: "PSTzkFMvcjZKLJfzxiTMqPJV9Ni5E4RqQaE3kZw1kNr",
    decimals: 6,
  },
  {
    symbol: "JUPUSD",
    name: "Jupiter USD",
    mint: "JUPUSDh8wXbLxdGFmcyYZRcCZqU6RqJFHN4kMQcahm3r",
    decimals: 6,
  },
  {
    symbol: "ACRED",
    name: "ACRED",
    mint: "ACreDVQqFhfMCJPuHXwSfGtb6G3SjZMW38jdZV6vdYJ",
    decimals: 6,
  },
  {
    symbol: "SYRUPUSDC",
    name: "Syrup USDC",
    mint: "SYRUpPfJCBmYhBqEnMT7nGcLNvPWb6sRmCQFNdPUjdn",
    decimals: 6,
  },
  // Index feeds
  {
    symbol: "INDEX.FORD",
    name: "Ford Motor Index",
    mint: "FoRDe8jBV8pLq3aVnmb8BzYjhQhh3Jex1L6c1R12kmn",
    decimals: 6,
  },
  {
    symbol: "INDEX.GLXY",
    name: "Galaxy Digital Index",
    mint: "GLXYd1gita1aLB9W7T7R8mh3Bo7dqUVjSt3R6kp1tmz",
    decimals: 6,
  },
];

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
        token.mint.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => a.symbol.localeCompare(b.symbol));;

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
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${
              value.isCustom 
                ? 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30' 
                : 'from-purple-500/20 to-blue-500/20 border-white/10'
            } flex items-center justify-center border`}>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              Select from listed SPL tokens or enter an unlisted token address
            </DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "listed" | "unlisted")} className="w-full">
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
                  <span className="font-semibold text-cyan-300">Trade any SPL token:</span> Enter the mint address 
                  of any unlisted token to create an OTC deal with ZK-verified liquidity.
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
        </DialogContent>
      </Dialog>
    </>
  );
}
