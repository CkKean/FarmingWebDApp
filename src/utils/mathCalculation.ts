import Big from "big.js";
import { TokenAddress } from "../constants/tokens";

// Addition
export const add = (
  num1: number | string,
  num2: number | string,
  decimalPlaces = TokenAddress.CAKE_LP_TOKEN.decimal
) => {
  const result = new Big(num1).plus(num2);
  return result.toFixed(decimalPlaces);
};

// Subtraction
export const subtract = (
  num1: number | string,
  num2: number | string,
  decimalPlaces = TokenAddress.CAKE_LP_TOKEN.decimal
) => {
  const result = new Big(num1).minus(num2);
  return result.toFixed(decimalPlaces);
};

// Multiplication
export const multiply = (
  num1: number | string,
  num2: number | string,
  decimalPlaces = TokenAddress.CAKE_LP_TOKEN.decimal
) => {
  const result = new Big(num1).times(num2);
  return result.toFixed(decimalPlaces);
};

// Division
export const divide = (
  num1: number | string,
  num2: number | string,
  decimalPlaces = TokenAddress.CAKE_LP_TOKEN.decimal
) => {
  const result = new Big(num1).div(num2);
  return result.toFixed(decimalPlaces);
};

export const handleExponential = (
  number: number | string,
  decimalPlaces = TokenAddress.CAKE_LP_TOKEN.decimal
) => {
  const bigNumber = new Big(number);
  const formattedNumber = bigNumber.toFixed(decimalPlaces);

  return formattedNumber;
};

export const isLargerThan = (num1: string | number, num2: string | number) => {
  const bigNum1 = new Big(num1);
  const bigNum2 = new Big(num2);

  const comparison = bigNum1.cmp(bigNum2);

  if (comparison === 1) return true;
  return false;
};

export const isSmallerThan = (num1: string | number, num2: string | number) => {
  const bigNum1 = new Big(num1);
  const bigNum2 = new Big(num2);

  const comparison = bigNum1.cmp(bigNum2);

  if (comparison === -1) return true;
  return false;
};

export const isEqual = (num1: string | number, num2: string | number) => {
  const bigNum1 = new Big(num1);
  const bigNum2 = new Big(num2);

  const comparison = bigNum1.cmp(bigNum2);

  if (comparison !== -1 && comparison !== 1) return true;
  return false;
};
