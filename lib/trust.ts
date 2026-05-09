// MicroCharity Trust constants — used on donation receipts and on the offline-donation
// instructions panel. Sourced from the legacy 80G receipt template.
// Edit here if any of these change; they're stamped onto every receipt PDF.

export const TRUST = {
  name: "MicroCharity Trust",
  legalName: "MicroCharity Trust ®",
  pan: "AADTM8753H",
  exemption80G:
    "DIT(E)BLR/80G/K-70/AATFM6359B/ITO(E)-2/Vol 2014-2015",
  csrNumber: "CSR00006450",
  trustRegistration: "KEN-4-00113-2010-11",
  registrationSince: "15-July-2014",
  address: {
    line1: "112 West Village, Kengeri",
    line2: "Bangalore - 560060",
  },
  website: "www.microcharity.com",
  email: "info@microcharity.com",
  exemptionOrderUrl:
    "http://www.microcharity.com/public/docs/MicroCharityTrust80GExemptionOrder.pdf",
};

// NEFT / IMPS / RTGS bank details shown to donors who choose Offline mode.
export const BANK = {
  accountName: "MicroCharity Trust",
  accountNumber: "0583073000000025",
  accountType: "CURRENT ACCOUNT",
  bank: "SOUTH INDIAN BANK",
  branch: "Kengeri Satellite Town, Bangalore",
  ifsc: "SIBL0000583",
};
