import Big from "big.js";

// Addition
export const add = (
  num1: number | string,
  num2: number | string,
  decimalPlaces = 9
) => {
  const result = new Big(num1).plus(num2);
  return result.toFixed(decimalPlaces);
};

// Subtraction
export const subtract = (
  num1: number | string,
  num2: number | string,
  decimalPlaces = 9
) => {
  const result = new Big(num1).minus(num2);
  return result.toFixed(decimalPlaces);
};

// Multiplication
export const multiply = (
  num1: number | string,
  num2: number | string,
  decimalPlaces = 9
) => {
  const result = new Big(num1).times(num2);
  return result.toFixed(decimalPlaces);
};

// Division
export const divide = (
  num1: number | string,
  num2: number | string,
  decimalPlaces = 9
) => {
  const result = new Big(num1).div(num2);
  return result.toFixed(decimalPlaces);
};

export const handleExponential = (
  number: number | string,
  decimalPlaces = 9
) => {
  const bigNumber = new Big(number);
  const formattedNumber = bigNumber.toFixed(decimalPlaces);

  return formattedNumber;
};
