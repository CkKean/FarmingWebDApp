import { TokenAddress } from "./tokenAddresses";

export const ContractAddress: Record<string, any> = {
  FARM: {
    address: "0x439ec8159740a9B9a579F286963Ac1C050aF31C8",
    name: "LP Token Restaking Farm",
    symbol: null,
  },
  PURSE_BUSD: {
    address: "0x081F4B87F223621B4B31cB7A727BB583586eAD98",
    symbol: "Cake-LP",
    name: "Pancake LPs",
    token0: TokenAddress.PURSE_TOKEN,
    token1: TokenAddress.BUSD_TOKEN,
  },
};
