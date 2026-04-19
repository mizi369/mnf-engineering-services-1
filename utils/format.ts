export function numberToWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

  function convert_millions(num: number): string {
    if (num >= 1000000) {
      return convert_millions(Math.floor(num / 1000000)) + " MILLION " + convert_thousands(num % 1000000);
    } else {
      return convert_thousands(num);
    }
  }

  function convert_thousands(num: number): string {
    if (num >= 1000) {
      return convert_hundreds(Math.floor(num / 1000)) + " THOUSAND " + convert_hundreds(num % 1000);
    } else {
      return convert_hundreds(num);
    }
  }

  function convert_hundreds(num: number): string {
    if (num > 99) {
      return ones[Math.floor(num / 100)] + " HUNDRED " + convert_tens(num % 100);
    } else {
      return convert_tens(num);
    }
  }

  function convert_tens(num: number): string {
    if (num < 10) return ones[num];
    else if (num >= 10 && num < 20) return teens[num - 10];
    else {
      return tens[Math.floor(num / 10)] + " " + ones[num % 10];
    }
  }

  if (num === 0) return "ZERO";
  
  const wholeNumber = Math.floor(num);
  const decimalPart = Math.round((num - wholeNumber) * 100);
  
  let result = "RINGGIT MALAYSIA " + convert_millions(wholeNumber);
  
  if (decimalPart > 0) {
    result += " AND CENTS " + convert_tens(decimalPart);
  }
  
  return result + " ONLY";
}
