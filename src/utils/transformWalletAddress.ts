export const transformWalletAddress = (walletAddress: string) => {
  const firstFour = walletAddress.slice(0, 4);
  const lastFour = walletAddress.slice(-4);
  return `${firstFour}...${lastFour}`;
};
