/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/settlement_engine.json`.
 */
export type SettlementEngine = {
  "address": "7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG",
  "metadata": {
    "name": "settlementEngine",
    "version": "1.0.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelRfq",
      "discriminator": [
        65,
        47,
        228,
        229,
        50,
        93,
        212,
        236
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true,
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "closeConfig",
      "discriminator": [
        145,
        9,
        72,
        157,
        95,
        125,
        61,
        85
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "closeExpired",
      "discriminator": [
        138,
        186,
        164,
        245,
        32,
        116,
        162,
        62
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true,
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "slashedBondsTracker"
          ]
        },
        {
          "name": "bondsEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "treasuryWallet",
          "writable": true,
          "relations": [
            "slashedBondsTracker"
          ]
        },
        {
          "name": "treasuryAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasuryWallet"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "makerPaymentAccount",
          "writable": true
        },
        {
          "name": "slashedBondsTracker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  108,
                  97,
                  115,
                  104,
                  101,
                  100,
                  95,
                  98,
                  111,
                  110,
                  100,
                  115,
                  95,
                  116,
                  114,
                  97,
                  99,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "closeIncomplete",
      "discriminator": [
        204,
        128,
        137,
        193,
        251,
        158,
        139,
        20
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true,
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          },
          "relations": [
            "settlement"
          ]
        },
        {
          "name": "settlement",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "baseMint"
        },
        {
          "name": "vaultBaseAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "baseMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "makerBaseAccount",
          "writable": true
        },
        {
          "name": "usdcMint",
          "relations": [
            "slashedBondsTracker"
          ]
        },
        {
          "name": "bondsEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "makerPaymentAccount",
          "writable": true
        },
        {
          "name": "treasuryWallet",
          "writable": true,
          "relations": [
            "slashedBondsTracker"
          ]
        },
        {
          "name": "treasuryAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasuryWallet"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "slashedBondsTracker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  108,
                  97,
                  115,
                  104,
                  101,
                  100,
                  95,
                  98,
                  111,
                  110,
                  100,
                  115,
                  95,
                  116,
                  114,
                  97,
                  99,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "commitQuote",
      "discriminator": [
        2,
        56,
        74,
        255,
        219,
        109,
        237,
        247
      ],
      "accounts": [
        {
          "name": "taker",
          "docs": [
            "Taker committing to a quote"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "docs": [
            "Global config account"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true
        },
        {
          "name": "usdcMint",
          "docs": [
            "USDC mint from config"
          ]
        },
        {
          "name": "quote",
          "docs": [
            "One Quote account per (rfq, taker)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        },
        {
          "name": "commitGuard",
          "docs": [
            "Global guard against commit_hash reuse"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  45,
                  103,
                  117,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "commitHash"
              }
            ]
          }
        },
        {
          "name": "bondsEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "takerPaymentAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "Needed because we `init` PDAs (quote, commit_guard)"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "instructionSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "commitHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "liquidityProof",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "facilitator",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "completeSettlement",
      "discriminator": [
        204,
        142,
        168,
        39,
        247,
        27,
        183,
        240
      ],
      "accounts": [
        {
          "name": "taker",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryWallet",
          "writable": true
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.maker",
                "account": "rfq"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          }
        },
        {
          "name": "settlement",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "baseMint"
        },
        {
          "name": "quoteMint"
        },
        {
          "name": "treasuryAta",
          "docs": [
            "USDC treasury ATA – receives slashed bonds only"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasuryWallet"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "treasuryQuoteAta",
          "docs": [
            "Quote-mint treasury ATA – receives the treasury's share of the taker fee"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasuryWallet"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "quoteMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "bondsEscrow",
          "docs": [
            "USDC bonds escrow (bonds only, no fees)"
          ],
          "writable": true
        },
        {
          "name": "feeEscrow",
          "docs": [
            "Quote-mint fee escrow – holds facilitator share until withdraw_reward"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "quoteMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "takerPaymentAccount",
          "writable": true
        },
        {
          "name": "makerPaymentAccount",
          "writable": true
        },
        {
          "name": "vaultBaseAta",
          "writable": true
        },
        {
          "name": "takerBaseAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "taker"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "baseMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "makerQuoteAccount",
          "writable": true
        },
        {
          "name": "takerQuoteAccount",
          "writable": true
        },
        {
          "name": "feesTracker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
                  115,
                  95,
                  116,
                  114,
                  97,
                  99,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "initConfig",
      "discriminator": [
        23,
        235,
        115,
        232,
        168,
        96,
        1,
        231
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Admin is also the payer. This simplifies auth & testing."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "docs": [
            "Global Config PDA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "usdcMint",
          "type": "pubkey"
        },
        {
          "name": "treasuryWallet",
          "type": "pubkey"
        },
        {
          "name": "liquidityGuard",
          "type": "pubkey"
        },
        {
          "name": "facilitatorFeeBps",
          "type": {
            "option": "u16"
          }
        }
      ]
    },
    {
      "name": "initRfq",
      "discriminator": [
        131,
        189,
        247,
        89,
        198,
        74,
        146,
        107
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "arg",
                "path": "uuid"
              }
            ]
          }
        },
        {
          "name": "bondsEscrow",
          "docs": [
            "Create RFQ-owned USDC ATA for bonds"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "makerPaymentAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "uuid",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "baseMint",
          "type": "pubkey"
        },
        {
          "name": "quoteMint",
          "type": "pubkey"
        },
        {
          "name": "bondAmount",
          "type": "u64"
        },
        {
          "name": "baseAmount",
          "type": "u64"
        },
        {
          "name": "minQuoteAmount",
          "type": "u64"
        },
        {
          "name": "takerFeeBps",
          "type": "u16"
        },
        {
          "name": "commitTtlSecs",
          "type": "u32"
        },
        {
          "name": "revealTtlSecs",
          "type": "u32"
        },
        {
          "name": "selectionTtlSecs",
          "type": "u32"
        },
        {
          "name": "fundTtlSecs",
          "type": "u32"
        },
        {
          "name": "facilitator",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "openRfq",
      "discriminator": [
        15,
        64,
        102,
        65,
        193,
        240,
        126,
        45
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true,
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "bondsEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "makerPaymentAccount",
          "writable": true
        },
        {
          "name": "slashedBondsTracker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  108,
                  97,
                  115,
                  104,
                  101,
                  100,
                  95,
                  98,
                  111,
                  110,
                  100,
                  115,
                  95,
                  116,
                  114,
                  97,
                  99,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "refundQuoteBonds",
      "discriminator": [
        86,
        0,
        190,
        122,
        176,
        13,
        253,
        199
      ],
      "accounts": [
        {
          "name": "taker",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "treasuryWallet",
          "writable": true,
          "relations": [
            "slashedBondsTracker"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.maker",
                "account": "rfq"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          }
        },
        {
          "name": "quote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        },
        {
          "name": "usdcMint",
          "relations": [
            "slashedBondsTracker"
          ]
        },
        {
          "name": "treasuryAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasuryWallet"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "bondsEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "takerPaymentAccount",
          "writable": true
        },
        {
          "name": "slashedBondsTracker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  108,
                  97,
                  115,
                  104,
                  101,
                  100,
                  95,
                  98,
                  111,
                  110,
                  100,
                  115,
                  95,
                  116,
                  114,
                  97,
                  99,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "revealQuote",
      "discriminator": [
        78,
        23,
        168,
        150,
        128,
        0,
        61,
        134
      ],
      "accounts": [
        {
          "name": "taker",
          "docs": [
            "Taker revealing their previously committed quote"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "quote"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.maker",
                "account": "rfq"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          },
          "relations": [
            "quote"
          ]
        },
        {
          "name": "quote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "quoteAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "selectQuote",
      "discriminator": [
        110,
        240,
        248,
        235,
        8,
        120,
        178,
        95
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true,
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          }
        },
        {
          "name": "quote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "account",
                "path": "quote.taker",
                "account": "quote"
              }
            ]
          }
        },
        {
          "name": "settlement",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "quoteMint"
        },
        {
          "name": "makerQuoteAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "quoteMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "baseMint"
        },
        {
          "name": "vaultBaseAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "baseMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "makerBaseAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "setQuoteFacilitator",
      "discriminator": [
        59,
        228,
        114,
        65,
        204,
        136,
        171,
        10
      ],
      "accounts": [
        {
          "name": "taker",
          "writable": true,
          "signer": true,
          "relations": [
            "quote"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.maker",
                "account": "rfq"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          },
          "relations": [
            "quote"
          ]
        },
        {
          "name": "quote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "update",
          "type": {
            "defined": {
              "name": "facilitatorUpdate"
            }
          }
        }
      ]
    },
    {
      "name": "setRfqFacilitator",
      "discriminator": [
        44,
        46,
        214,
        226,
        238,
        44,
        232,
        78
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true,
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "update",
          "type": {
            "defined": {
              "name": "facilitatorUpdate"
            }
          }
        }
      ]
    },
    {
      "name": "updateConfig",
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newUsdcMint",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newTreasuryWallet",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newLiquidityGuard",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newFacilitatorFeeBps",
          "type": {
            "option": "u16"
          }
        }
      ]
    },
    {
      "name": "updateRfq",
      "discriminator": [
        231,
        185,
        228,
        74,
        146,
        50,
        125,
        255
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true,
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newBaseMint",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newQuoteMint",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newBondAmount",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newBaseAmount",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newMinQuoteAmount",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newTakerFeeBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newCommitTtlSecs",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "newRevealTtlSecs",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "newSelectionTtlSecs",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "newFundTtlSecs",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "newFacilitatorUpdate",
          "type": {
            "option": {
              "defined": {
                "name": "facilitatorUpdate"
              }
            }
          }
        }
      ]
    },
    {
      "name": "withdrawReward",
      "discriminator": [
        191,
        187,
        176,
        137,
        9,
        25,
        187,
        244
      ],
      "accounts": [
        {
          "name": "facilitator",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.maker",
                "account": "rfq"
              },
              {
                "kind": "account",
                "path": "rfq.uuid",
                "account": "rfq"
              }
            ]
          },
          "relations": [
            "settlement",
            "quote"
          ]
        },
        {
          "name": "settlement",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "quote",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "account",
                "path": "settlement.taker",
                "account": "settlement"
              }
            ]
          },
          "relations": [
            "settlement"
          ]
        },
        {
          "name": "quoteMint"
        },
        {
          "name": "feeEscrow",
          "docs": [
            "Fee escrow holds the facilitator's share in quote_mint tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "quoteMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "facilitatorAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "facilitator"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "quoteMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "facilitatorRewardTracker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  105,
                  108,
                  105,
                  116,
                  97,
                  116,
                  111,
                  114,
                  95,
                  114,
                  101,
                  119,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "account",
                "path": "facilitator"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "commitGuard",
      "discriminator": [
        174,
        20,
        183,
        173,
        110,
        104,
        189,
        172
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "facilitatorRewardTracker",
      "discriminator": [
        60,
        238,
        131,
        167,
        97,
        185,
        174,
        250
      ]
    },
    {
      "name": "feesTracker",
      "discriminator": [
        146,
        84,
        81,
        115,
        69,
        240,
        130,
        222
      ]
    },
    {
      "name": "quote",
      "discriminator": [
        167,
        202,
        20,
        198,
        228,
        66,
        105,
        208
      ]
    },
    {
      "name": "rfq",
      "discriminator": [
        106,
        19,
        109,
        78,
        169,
        13,
        234,
        58
      ]
    },
    {
      "name": "settlement",
      "discriminator": [
        55,
        11,
        219,
        33,
        36,
        136,
        40,
        182
      ]
    },
    {
      "name": "slashedBondsTracker",
      "discriminator": [
        107,
        226,
        129,
        138,
        92,
        159,
        47,
        55
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidRfqState",
      "msg": "Invalid RFQ state for this instruction"
    },
    {
      "code": 6001,
      "name": "tooEarly",
      "msg": "Deadline has not been reached yet"
    },
    {
      "code": 6002,
      "name": "quoteRefundBeforeFundingDeadline",
      "msg": "Cannot refund quote bonds before the funding deadline has passed"
    },
    {
      "code": 6003,
      "name": "expireTooEarly",
      "msg": "RFQ cannot be expired yet"
    },
    {
      "code": 6004,
      "name": "tooLate",
      "msg": "Deadline passed"
    },
    {
      "code": 6005,
      "name": "commitTooLate",
      "msg": "Commit Deadline passed"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "Unauthorized caller for this action"
    },
    {
      "code": 6007,
      "name": "alreadySelected",
      "msg": "RFQ already has a selected quote"
    },
    {
      "code": 6008,
      "name": "noSelection",
      "msg": "No quote selected"
    },
    {
      "code": 6009,
      "name": "nothingToClose",
      "msg": "Nothing to close or claim"
    },
    {
      "code": 6010,
      "name": "invalidParams",
      "msg": "Invalid parameters"
    },
    {
      "code": 6011,
      "name": "invalidBondVault",
      "msg": "Invalid Bond Vault account"
    },
    {
      "code": 6012,
      "name": "invalidBondAmount",
      "msg": "Invalid Bond Amount"
    },
    {
      "code": 6013,
      "name": "invalidFeeAmount",
      "msg": "Invalid Fee Amount"
    },
    {
      "code": 6014,
      "name": "invalidBaseAmount",
      "msg": "Invalid Base Amount"
    },
    {
      "code": 6015,
      "name": "invalidMinQuoteAmount",
      "msg": "Invalid Min Quote Amount"
    },
    {
      "code": 6016,
      "name": "invalidCommitTtl",
      "msg": "Invalid TTL for Commit phase"
    },
    {
      "code": 6017,
      "name": "invalidRevealTtl",
      "msg": "Invalid TTL for Reveal phase"
    },
    {
      "code": 6018,
      "name": "invalidSelectionTtl",
      "msg": "Invalid TTL for Selection phase"
    },
    {
      "code": 6019,
      "name": "invalidFundingTtl",
      "msg": "Invalid TTL for Funding phase"
    },
    {
      "code": 6020,
      "name": "selectionTooEarly",
      "msg": "Selection attempted too early"
    },
    {
      "code": 6021,
      "name": "selectionTooLate",
      "msg": "Selection deadline passed"
    },
    {
      "code": 6022,
      "name": "makerPaymentAccountClosed",
      "msg": "Maker payment account is frozen or closed"
    },
    {
      "code": 6023,
      "name": "makerBaseAccountClosed",
      "msg": "Maker base account is frozen or closed"
    },
    {
      "code": 6024,
      "name": "unauthorizedMakerPaymentAccount",
      "msg": "Maker payment account is not authorized for this RFQ"
    },
    {
      "code": 6025,
      "name": "invalidBaseMint",
      "msg": "Base mint does not match RFQ requirement"
    },
    {
      "code": 6026,
      "name": "invalidQuoteMint",
      "msg": "Quote mint does not match RFQ requirement"
    },
    {
      "code": 6027,
      "name": "invalidRfqPda",
      "msg": "RFQ PDA does not match expected seeds"
    },
    {
      "code": 6028,
      "name": "fundingTooLate",
      "msg": "Funding deadline passed"
    },
    {
      "code": 6029,
      "name": "revealTooLate",
      "msg": "Reveal Deadline passed"
    },
    {
      "code": 6030,
      "name": "revealTooEarly",
      "msg": "Reveal attempted too early"
    },
    {
      "code": 6031,
      "name": "noEd25519Instruction",
      "msg": "No Ed25519 instruction found"
    },
    {
      "code": 6032,
      "name": "invalidEd25519Program",
      "msg": "Invalid Ed25519 program ID"
    },
    {
      "code": 6033,
      "name": "invalidEd25519Data",
      "msg": "Invalid Ed25519 instruction data"
    },
    {
      "code": 6034,
      "name": "invalidSignatureCount",
      "msg": "Invalid signature count"
    },
    {
      "code": 6035,
      "name": "invalidOffset",
      "msg": "Invalid offset - security check failed"
    },
    {
      "code": 6036,
      "name": "invalidMessageSize",
      "msg": "Invalid message size"
    },
    {
      "code": 6037,
      "name": "invalidConfig",
      "msg": "Invalid config account"
    },
    {
      "code": 6038,
      "name": "unrevealedQuoteNotRefundable",
      "msg": "Quote must be revealed before bonds can be refunded"
    },
    {
      "code": 6039,
      "name": "quoteBondsAlreadyRefunded",
      "msg": "Bonds have already been refunded for this quote"
    },
    {
      "code": 6040,
      "name": "selectedQuoteNotRefundable",
      "msg": "Selected quote cannot be refunded; taker should complete settlement"
    },
    {
      "code": 6041,
      "name": "invalidRfq",
      "msg": "Settlement does not belong to RFQ"
    },
    {
      "code": 6042,
      "name": "invalidTaker",
      "msg": "Settlement does not belong to taker"
    },
    {
      "code": 6043,
      "name": "invalidQuote",
      "msg": "Settlement does not belong to quote"
    },
    {
      "code": 6044,
      "name": "invalidTakerPaymentAccount",
      "msg": "Taker payment account mismatch with expected settlement account"
    },
    {
      "code": 6045,
      "name": "invalidOwner",
      "msg": "Invalid owner for provided account"
    },
    {
      "code": 6046,
      "name": "pdaMismatch",
      "msg": "PDA derived does not match expected address"
    },
    {
      "code": 6047,
      "name": "bumpMismatch",
      "msg": "Bump provided does not match derived value"
    },
    {
      "code": 6048,
      "name": "unauthorizedSigner",
      "msg": "Unauthorized liquidity guard signer - not the expected public key"
    },
    {
      "code": 6049,
      "name": "commitHashMismatch",
      "msg": "Commit hash mismatch"
    },
    {
      "code": 6050,
      "name": "liquidityProofSignatureMismatch",
      "msg": "Liquidity proof signature mismatch"
    },
    {
      "code": 6051,
      "name": "invalidQuoteAmount",
      "msg": "Quote amount is invalid (too low)"
    },
    {
      "code": 6052,
      "name": "quoteAlreadyRevealed",
      "msg": "Quote has already been revealed"
    },
    {
      "code": 6053,
      "name": "invalidQuoteState",
      "msg": "Invalid QUOTE state for this instruction"
    },
    {
      "code": 6054,
      "name": "takerPaymentAccountClosed",
      "msg": "Taker payment account is frozen or closed"
    },
    {
      "code": 6055,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow encountered during calculation"
    },
    {
      "code": 6056,
      "name": "invalidRfqAssociation",
      "msg": "Quote does not belong to the expected RFQ"
    },
    {
      "code": 6057,
      "name": "missingSlashedBondsTrackerAccount",
      "msg": "SlashedBondsTracker account missing"
    },
    {
      "code": 6058,
      "name": "missingQuoteAccount",
      "msg": "Quote account missing"
    }
  ],
  "types": [
    {
      "name": "commitGuard",
      "docs": [
        "Tiny PDA keyed by commit_hash to forbid reuse of the same hash."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "quote",
            "type": "pubkey"
          },
          {
            "name": "committedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "config",
      "docs": [
        "Global, singleton configuration for the deployment.",
        "PDA: seeds = [\"config\"], bump stored for signer seeds."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "treasuryWallet",
            "type": "pubkey"
          },
          {
            "name": "liquidityGuard",
            "type": "pubkey"
          },
          {
            "name": "facilitatorFeeBps",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "facilitatorRewardTracker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfq",
            "type": "pubkey"
          },
          {
            "name": "facilitator",
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "claimedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "facilitatorUpdate",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "clear"
          },
          {
            "name": "set",
            "fields": [
              "pubkey"
            ]
          }
        ]
      }
    },
    {
      "name": "feesTracker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfq",
            "type": "pubkey"
          },
          {
            "name": "taker",
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "type": "pubkey"
          },
          {
            "name": "treasuryWallet",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "payedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "quote",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfq",
            "docs": [
              "RFQ this quote belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "taker",
            "docs": [
              "Taker who owns this quote"
            ],
            "type": "pubkey"
          },
          {
            "name": "commitHash",
            "docs": [
              "32-byte commit hash and 64-byte liquidity_proof from liquidity-guard"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "liquidityProof",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "committedAt",
            "type": "i64"
          },
          {
            "name": "revealedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "maxFundingDeadline",
            "type": "i64"
          },
          {
            "name": "bondsRefundedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "quoteAmount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "takerPaymentAccount",
            "type": "pubkey"
          },
          {
            "name": "selected",
            "type": "bool"
          },
          {
            "name": "facilitator",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "rfq",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "maker",
            "type": "pubkey"
          },
          {
            "name": "uuid",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "rfqState"
              }
            }
          },
          {
            "name": "baseMint",
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "treasuryWallet",
            "type": "pubkey"
          },
          {
            "name": "liquidityGuard",
            "type": "pubkey"
          },
          {
            "name": "bondAmount",
            "type": "u64"
          },
          {
            "name": "baseAmount",
            "type": "u64"
          },
          {
            "name": "minQuoteAmount",
            "type": "u64"
          },
          {
            "name": "takerFeeBps",
            "type": "u16"
          },
          {
            "name": "facilitatorFeeBps",
            "type": "u16"
          },
          {
            "name": "commitTtlSecs",
            "type": "u32"
          },
          {
            "name": "revealTtlSecs",
            "type": "u32"
          },
          {
            "name": "selectionTtlSecs",
            "type": "u32"
          },
          {
            "name": "fundTtlSecs",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "openedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "selectedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "completedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "committedCount",
            "type": "u16"
          },
          {
            "name": "revealedCount",
            "type": "u16"
          },
          {
            "name": "selectedQuote",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "settlement",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bondsEscrow",
            "type": "pubkey"
          },
          {
            "name": "makerPaymentAccount",
            "type": "pubkey"
          },
          {
            "name": "facilitator",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "rfqState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "draft"
          },
          {
            "name": "open"
          },
          {
            "name": "committed"
          },
          {
            "name": "revealed"
          },
          {
            "name": "selected"
          },
          {
            "name": "settled"
          },
          {
            "name": "ignored"
          },
          {
            "name": "expired"
          },
          {
            "name": "incomplete"
          }
        ]
      }
    },
    {
      "name": "settlement",
      "docs": [
        "Captures the immutable settlement snapshot once a quote is selected."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfq",
            "type": "pubkey"
          },
          {
            "name": "quote",
            "type": "pubkey"
          },
          {
            "name": "maker",
            "type": "pubkey"
          },
          {
            "name": "taker",
            "type": "pubkey"
          },
          {
            "name": "baseMint",
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "type": "pubkey"
          },
          {
            "name": "baseAmount",
            "type": "u64"
          },
          {
            "name": "quoteAmount",
            "type": "u64"
          },
          {
            "name": "bondAmount",
            "type": "u64"
          },
          {
            "name": "takerFeeBps",
            "type": "u16"
          },
          {
            "name": "makerPaymentAccount",
            "docs": [
              "Token Accounts"
            ],
            "type": "pubkey"
          },
          {
            "name": "takerPaymentAccount",
            "type": "pubkey"
          },
          {
            "name": "bondsEscrow",
            "type": "pubkey"
          },
          {
            "name": "makerBaseAccount",
            "type": "pubkey"
          },
          {
            "name": "takerBaseAccount",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "vaultBaseAta",
            "type": "pubkey"
          },
          {
            "name": "makerQuoteAccount",
            "type": "pubkey"
          },
          {
            "name": "takerQuoteAccount",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "completedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "makerFundedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "takerFundedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "slashedBondsTracker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfq",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "treasuryWallet",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "seizedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
