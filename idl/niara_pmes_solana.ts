/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/niara_pmes_solana.json`.
 */
export type NiaraPmesSolana = {
  "address": "FKefGFhUmgXBM1xCtSFBWpoNnp3wuPJs6Yddpsp67J2y",
  "metadata": {
    "name": "niaraPmesSolana",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Niara SMEs on Solana: SME fundraising (CVM Res. 88) with on-chain escrow"
  },
  "instructions": [
    {
      "name": "aportar",
      "discriminator": [
        161,
        73,
        16,
        189,
        18,
        40,
        217,
        126
      ],
      "accounts": [
        {
          "name": "investidor",
          "writable": true,
          "signer": true
        },
        {
          "name": "oferta",
          "writable": true
        },
        {
          "name": "posicao",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  99,
                  97,
                  111
                ]
              },
              {
                "kind": "account",
                "path": "oferta"
              },
              {
                "kind": "account",
                "path": "investidor"
              }
            ]
          }
        },
        {
          "name": "qualificado",
          "docs": [
            "the seed guarantees nobody can pass someone else's account."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  97,
                  108,
                  105,
                  102,
                  105,
                  99,
                  97,
                  100,
                  111
                ]
              },
              {
                "kind": "account",
                "path": "investidor"
              }
            ]
          }
        },
        {
          "name": "origem",
          "writable": true
        },
        {
          "name": "cofre",
          "writable": true
        },
        {
          "name": "mintMoeda"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "valor",
          "type": "u64"
        }
      ]
    },
    {
      "name": "atualizarConfig",
      "discriminator": [
        187,
        20,
        118,
        1,
        1,
        187,
        80,
        70
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
          "name": "protocoloWallet",
          "type": "pubkey"
        },
        {
          "name": "taxaBps",
          "type": "u16"
        },
        {
          "name": "tetoPorInvestidor",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancelarOferta",
      "discriminator": [
        179,
        36,
        153,
        225,
        219,
        146,
        21,
        130
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
          "name": "oferta",
          "writable": true
        },
        {
          "name": "emissor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "oferta.emissor",
                "account": "oferta"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "criarOferta",
      "discriminator": [
        138,
        83,
        78,
        75,
        4,
        47,
        232,
        97
      ],
      "accounts": [
        {
          "name": "emissorWallet",
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
          "name": "emissor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "emissorWallet"
              }
            ]
          }
        },
        {
          "name": "oferta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  102,
                  101,
                  114,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "emissorWallet"
              },
              {
                "kind": "account",
                "path": "emissor.totalOfertas",
                "account": "emissor"
              }
            ]
          }
        },
        {
          "name": "mintCota",
          "docs": [
            "Shares: minted and frozen by the offering itself (only it issues them, and",
            "each share account is frozen on redemption, so no transfers, like the",
            "EVM `DenyAllTransferPolicy`)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "oferta"
              }
            ]
          }
        },
        {
          "name": "cofre",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  102,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "oferta"
              }
            ]
          }
        },
        {
          "name": "mintMoeda"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "parametros",
          "type": {
            "defined": {
              "name": "parametrosOferta"
            }
          }
        }
      ]
    },
    {
      "name": "definirEmissor",
      "discriminator": [
        149,
        162,
        151,
        84,
        231,
        255,
        127,
        155
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
          "name": "emissor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  111,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "wallet"
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
          "name": "wallet",
          "type": "pubkey"
        },
        {
          "name": "autorizado",
          "type": "bool"
        }
      ]
    },
    {
      "name": "definirQualificado",
      "discriminator": [
        211,
        210,
        217,
        110,
        127,
        222,
        151,
        16
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
          "name": "qualificado",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  97,
                  108,
                  105,
                  102,
                  105,
                  99,
                  97,
                  100,
                  111
                ]
              },
              {
                "kind": "arg",
                "path": "wallet"
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
          "name": "wallet",
          "type": "pubkey"
        },
        {
          "name": "qualificado",
          "type": "bool"
        }
      ]
    },
    {
      "name": "encerrar",
      "discriminator": [
        73,
        176,
        179,
        61,
        93,
        204,
        30,
        22
      ],
      "accounts": [
        {
          "name": "oferta",
          "writable": true
        },
        {
          "name": "emissor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "oferta.emissor",
                "account": "oferta"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "faucetMbrl",
      "discriminator": [
        35,
        73,
        161,
        204,
        181,
        132,
        144,
        71
      ],
      "accounts": [
        {
          "name": "usuario",
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
          "name": "mintMoeda",
          "writable": true
        },
        {
          "name": "destino",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "usuario"
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
                "path": "mintMoeda"
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
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "valor",
          "type": "u64"
        }
      ]
    },
    {
      "name": "inicializar",
      "discriminator": [
        38,
        175,
        49,
        47,
        251,
        17,
        202,
        203
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
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
        },
        {
          "name": "mintMoeda",
          "docs": [
            "MockBRL: the mint authority is the config itself (faucet controlled by the program)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  98,
                  114,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "programa",
          "docs": [
            "Only the holder of the upgrade authority can initialize, which prevents a",
            "third party from hijacking the config right after deployment."
          ],
          "address": "FKefGFhUmgXBM1xCtSFBWpoNnp3wuPJs6Yddpsp67J2y"
        },
        {
          "name": "dadosPrograma"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "protocoloWallet",
          "type": "pubkey"
        },
        {
          "name": "taxaBps",
          "type": "u16"
        },
        {
          "name": "tetoPorInvestidor",
          "type": "u64"
        }
      ]
    },
    {
      "name": "liberarParaEmissor",
      "discriminator": [
        93,
        45,
        61,
        180,
        155,
        12,
        203,
        231
      ],
      "accounts": [
        {
          "name": "pagador",
          "writable": true,
          "signer": true
        },
        {
          "name": "oferta",
          "writable": true
        },
        {
          "name": "cofre",
          "writable": true
        },
        {
          "name": "mintMoeda"
        },
        {
          "name": "emissorWallet"
        },
        {
          "name": "destinoEmissor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "emissorWallet"
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
                "path": "mintMoeda"
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
          "name": "protocoloWallet"
        },
        {
          "name": "destinoProtocolo",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "protocoloWallet"
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
                "path": "mintMoeda"
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
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "pausarOferta",
      "discriminator": [
        224,
        95,
        113,
        127,
        102,
        234,
        84,
        35
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
          "name": "oferta",
          "writable": true
        },
        {
          "name": "emissor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "oferta.emissor",
                "account": "oferta"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "pausada",
          "type": "bool"
        }
      ]
    },
    {
      "name": "reembolsar",
      "discriminator": [
        102,
        99,
        137,
        168,
        134,
        13,
        172,
        97
      ],
      "accounts": [
        {
          "name": "investidor",
          "writable": true,
          "signer": true
        },
        {
          "name": "oferta"
        },
        {
          "name": "posicao",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  99,
                  97,
                  111
                ]
              },
              {
                "kind": "account",
                "path": "oferta"
              },
              {
                "kind": "account",
                "path": "investidor"
              }
            ]
          }
        },
        {
          "name": "cofre",
          "writable": true
        },
        {
          "name": "mintMoeda"
        },
        {
          "name": "destino",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investidor"
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
                "path": "mintMoeda"
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
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "resgatarCotas",
      "discriminator": [
        191,
        136,
        59,
        217,
        40,
        243,
        21,
        114
      ],
      "accounts": [
        {
          "name": "investidor",
          "writable": true,
          "signer": true
        },
        {
          "name": "oferta"
        },
        {
          "name": "posicao",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  99,
                  97,
                  111
                ]
              },
              {
                "kind": "account",
                "path": "oferta"
              },
              {
                "kind": "account",
                "path": "investidor"
              }
            ]
          }
        },
        {
          "name": "mintCota",
          "writable": true
        },
        {
          "name": "destino",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investidor"
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
                "path": "mintCota"
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
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
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
      "name": "emissor",
      "discriminator": [
        95,
        16,
        27,
        170,
        224,
        148,
        153,
        225
      ]
    },
    {
      "name": "oferta",
      "discriminator": [
        230,
        49,
        46,
        160,
        215,
        0,
        131,
        110
      ]
    },
    {
      "name": "posicao",
      "discriminator": [
        146,
        168,
        151,
        107,
        159,
        159,
        140,
        160
      ]
    },
    {
      "name": "qualificado",
      "discriminator": [
        23,
        141,
        94,
        119,
        131,
        151,
        158,
        109
      ]
    }
  ],
  "events": [
    {
      "name": "aporte",
      "discriminator": [
        154,
        197,
        120,
        78,
        134,
        58,
        222,
        5
      ]
    },
    {
      "name": "cotasResgatadas",
      "discriminator": [
        135,
        207,
        249,
        5,
        245,
        173,
        16,
        162
      ]
    },
    {
      "name": "emissorDefinido",
      "discriminator": [
        71,
        102,
        41,
        231,
        76,
        226,
        208,
        94
      ]
    },
    {
      "name": "ofertaCancelada",
      "discriminator": [
        194,
        98,
        10,
        152,
        228,
        86,
        49,
        245
      ]
    },
    {
      "name": "ofertaCriada",
      "discriminator": [
        222,
        254,
        62,
        245,
        66,
        12,
        74,
        233
      ]
    },
    {
      "name": "ofertaEncerrada",
      "discriminator": [
        8,
        156,
        165,
        151,
        234,
        80,
        111,
        106
      ]
    },
    {
      "name": "ofertaPausadaAlterada",
      "discriminator": [
        92,
        166,
        51,
        29,
        207,
        201,
        186,
        14
      ]
    },
    {
      "name": "qualificacaoAlterada",
      "discriminator": [
        66,
        15,
        115,
        13,
        84,
        19,
        87,
        200
      ]
    },
    {
      "name": "recursosLiberados",
      "discriminator": [
        13,
        126,
        25,
        251,
        85,
        75,
        82,
        25
      ]
    },
    {
      "name": "reembolso",
      "discriminator": [
        199,
        238,
        120,
        84,
        69,
        111,
        131,
        211
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "naoAutorizado",
      "msg": "Somente o admin do programa"
    },
    {
      "code": 6001,
      "name": "taxaAcimaDoMaximo",
      "msg": "Taxa acima de 1% (100 bps)"
    },
    {
      "code": 6002,
      "name": "faucetInvalido",
      "msg": "Valor do faucet deve ser > 0 e <= 1.000.000 mBRL"
    },
    {
      "code": 6003,
      "name": "emissorNaoAutorizado",
      "msg": "Carteira não autorizada como emissora"
    },
    {
      "code": 6004,
      "name": "ofertaAnteriorAindaAberta",
      "msg": "A última oferta deste emissor ainda está aberta"
    },
    {
      "code": 6005,
      "name": "metadadosInvalidos",
      "msg": "Nome, símbolo, empresa ou série inválidos"
    },
    {
      "code": 6006,
      "name": "metasInvalidas",
      "msg": "Meta mínima deve ser > 0 e <= meta máxima"
    },
    {
      "code": 6007,
      "name": "precoInvalido",
      "msg": "Preço por cota deve ser > 0"
    },
    {
      "code": 6008,
      "name": "prazoExcedeLimite",
      "msg": "Prazo no passado ou acima de 180 dias (Res. CVM 88)"
    },
    {
      "code": 6009,
      "name": "metaMaximaExcedeTeto",
      "msg": "Meta máxima acima de R$ 15 milhões (Res. CVM 88)"
    },
    {
      "code": 6010,
      "name": "loteAdicionalExcedeLimite",
      "msg": "Lote adicional acima de 25% da meta mínima (Res. CVM 88)"
    },
    {
      "code": 6011,
      "name": "precoNaoDivideMetaMaxima",
      "msg": "O preço por cota precisa dividir a meta máxima"
    },
    {
      "code": 6012,
      "name": "ofertaNaoAberta",
      "msg": "Oferta não está aberta"
    },
    {
      "code": 6013,
      "name": "ofertaPausada",
      "msg": "Oferta pausada"
    },
    {
      "code": 6014,
      "name": "prazoExpirado",
      "msg": "Prazo da oferta expirado"
    },
    {
      "code": 6015,
      "name": "aporteNaoMultiploDoPreco",
      "msg": "Aporte deve ser múltiplo do preço por cota"
    },
    {
      "code": 6016,
      "name": "excedeMetaMaxima",
      "msg": "Aporte excede a meta máxima"
    },
    {
      "code": 6017,
      "name": "excedeTetoInvestidor",
      "msg": "Aporte excede o teto por investidor"
    },
    {
      "code": 6018,
      "name": "encerramentoPrematuro",
      "msg": "Encerramento antes do prazo exige meta máxima atingida"
    },
    {
      "code": 6019,
      "name": "ofertaNaoSucedida",
      "msg": "Oferta não encerrou com sucesso"
    },
    {
      "code": 6020,
      "name": "ofertaNaoFalhou",
      "msg": "Oferta não falhou"
    },
    {
      "code": 6021,
      "name": "nadaAResgatar",
      "msg": "Nada a resgatar"
    },
    {
      "code": 6022,
      "name": "cotasJaResgatadas",
      "msg": "Cotas já resgatadas"
    },
    {
      "code": 6023,
      "name": "recursosJaLiberados",
      "msg": "Recursos já liberados"
    },
    {
      "code": 6024,
      "name": "nadaAReembolsar",
      "msg": "Nada a reembolsar"
    },
    {
      "code": 6025,
      "name": "jaReembolsado",
      "msg": "Já reembolsado"
    },
    {
      "code": 6026,
      "name": "overflow",
      "msg": "Estouro aritmético"
    }
  ],
  "types": [
    {
      "name": "aporte",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oferta",
            "type": "pubkey"
          },
          {
            "name": "investidor",
            "type": "pubkey"
          },
          {
            "name": "valor",
            "type": "u64"
          },
          {
            "name": "totalArrecadado",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "config",
      "docs": [
        "Global configuration (PDA [\"config\"]). Equivalent to the parameters of",
        "`OfertaOrquestrador` plus the admin role."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "mintMoeda",
            "docs": [
              "MockBRL mint (PDA [\"mbrl\"]); authority = this config."
            ],
            "type": "pubkey"
          },
          {
            "name": "protocoloWallet",
            "type": "pubkey"
          },
          {
            "name": "taxaBps",
            "type": "u16"
          },
          {
            "name": "tetoPorInvestidor",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "bumpMoeda",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "cotasResgatadas",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oferta",
            "type": "pubkey"
          },
          {
            "name": "investidor",
            "type": "pubkey"
          },
          {
            "name": "cotas",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "emissor",
      "docs": [
        "Authorized issuer (PDA [\"emissor\", wallet])."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "autorizado",
            "type": "bool"
          },
          {
            "name": "ofertaAberta",
            "docs": [
              "This issuer's still-open offering (at most one, as on EVM)."
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "totalOfertas",
            "docs": [
              "How many offerings it has created; also the index of the next one (offering seed)."
            ],
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "emissorDefinido",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "autorizado",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "estado",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "aberta"
          },
          {
            "name": "encerradaSucesso"
          },
          {
            "name": "encerradaFalha"
          }
        ]
      }
    },
    {
      "name": "oferta",
      "docs": [
        "Fundraising offering (PDA [\"oferta\", issuer, index LE]). Combines what on",
        "EVM is ParticipacaoToken (metadata) + OfertaCaptacao (escrow and rules)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "emissor",
            "type": "pubkey"
          },
          {
            "name": "indice",
            "type": "u32"
          },
          {
            "name": "mintCota",
            "docs": [
              "Share mint (PDA [\"cota\", offering]), 0 decimals; authority = the offering."
            ],
            "type": "pubkey"
          },
          {
            "name": "cofre",
            "docs": [
              "Escrow account in mBRL (PDA [\"cofre\", offering]); authority = the offering."
            ],
            "type": "pubkey"
          },
          {
            "name": "nome",
            "type": "string"
          },
          {
            "name": "simbolo",
            "type": "string"
          },
          {
            "name": "empresa",
            "type": "string"
          },
          {
            "name": "cnpjRef",
            "docs": [
              "keccak256(CNPJ), same as `cnpjRef` on EVM: identifies the company without exposing its CNPJ."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "serie",
            "type": "string"
          },
          {
            "name": "metaMinima",
            "type": "u64"
          },
          {
            "name": "metaMaxima",
            "type": "u64"
          },
          {
            "name": "precoPorCota",
            "type": "u64"
          },
          {
            "name": "abertura",
            "type": "i64"
          },
          {
            "name": "prazo",
            "type": "i64"
          },
          {
            "name": "tetoPorInvestidor",
            "type": "u64"
          },
          {
            "name": "taxaBps",
            "type": "u16"
          },
          {
            "name": "protocoloWallet",
            "type": "pubkey"
          },
          {
            "name": "estado",
            "type": {
              "defined": {
                "name": "estado"
              }
            }
          },
          {
            "name": "pausada",
            "type": "bool"
          },
          {
            "name": "totalArrecadado",
            "type": "u64"
          },
          {
            "name": "totalInvestidores",
            "type": "u32"
          },
          {
            "name": "recursosLiberados",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "bumpMintCota",
            "type": "u8"
          },
          {
            "name": "bumpCofre",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "ofertaCancelada",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oferta",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "ofertaCriada",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oferta",
            "type": "pubkey"
          },
          {
            "name": "emissor",
            "type": "pubkey"
          },
          {
            "name": "mintCota",
            "type": "pubkey"
          },
          {
            "name": "empresa",
            "type": "string"
          },
          {
            "name": "cnpjRef",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "serie",
            "type": "string"
          },
          {
            "name": "metaMinima",
            "type": "u64"
          },
          {
            "name": "metaMaxima",
            "type": "u64"
          },
          {
            "name": "precoPorCota",
            "type": "u64"
          },
          {
            "name": "prazo",
            "type": "i64"
          },
          {
            "name": "taxaBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "ofertaEncerrada",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oferta",
            "type": "pubkey"
          },
          {
            "name": "sucesso",
            "type": "bool"
          },
          {
            "name": "totalArrecadado",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "ofertaPausadaAlterada",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oferta",
            "type": "pubkey"
          },
          {
            "name": "pausada",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "parametrosOferta",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nome",
            "type": "string"
          },
          {
            "name": "simbolo",
            "type": "string"
          },
          {
            "name": "empresa",
            "type": "string"
          },
          {
            "name": "cnpjRef",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "serie",
            "type": "string"
          },
          {
            "name": "metaMinima",
            "type": "u64"
          },
          {
            "name": "metaMaxima",
            "type": "u64"
          },
          {
            "name": "precoPorCota",
            "type": "u64"
          },
          {
            "name": "prazo",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "posicao",
      "docs": [
        "An investor's position in an offering (PDA [\"posicao\", offering, investor])."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oferta",
            "type": "pubkey"
          },
          {
            "name": "investidor",
            "type": "pubkey"
          },
          {
            "name": "aportado",
            "type": "u64"
          },
          {
            "name": "cotasResgatadas",
            "type": "bool"
          },
          {
            "name": "reembolsado",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "qualificacaoAlterada",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "qualificado",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "qualificado",
      "docs": [
        "Qualified investor (PDA [\"qualificado\", wallet]): no per-investor cap."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "qualificado",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "recursosLiberados",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oferta",
            "type": "pubkey"
          },
          {
            "name": "emissor",
            "type": "pubkey"
          },
          {
            "name": "valorEmissor",
            "type": "u64"
          },
          {
            "name": "protocoloWallet",
            "type": "pubkey"
          },
          {
            "name": "taxa",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "reembolso",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oferta",
            "type": "pubkey"
          },
          {
            "name": "investidor",
            "type": "pubkey"
          },
          {
            "name": "valor",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
