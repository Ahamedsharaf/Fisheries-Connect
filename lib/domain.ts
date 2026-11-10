export const districts = [
  "Negombo",
  "Kalmunai",
  "Sainthamaruthu",
  "Colombo",
  "Beruwala",
  "Galle",
  "Matara",
  "Trincomalee",
  "Batticaloa",
  "Jaffna",
  "Chilaw",
];
export const categories = ["Fish", "Prawns", "Crab", "Squid"];
export const subtotal = (price: number, cleaning: number, grams: number) =>
  Math.round(((price + cleaning) * grams) / 1000);
export const nextStates = (state: string, buyer: boolean): string[] =>
  buyer
    ? state === "awaiting"
      ? ["cancelled"]
      : []
    : (
        {
          awaiting: ["accepted", "cancelled"],
          accepted: ["preparing", "cancelled"],
          preparing: ["ready"],
          ready: ["completed"],
        } as Record<string, string[]>
      )[state] || [];
export const samples = [
  [
    "tuna",
    "Yellowfin tuna",
    "Fish",
    240000,
    "Fresh cuts, ready for your kitchen.",
  ],
  [
    "prawns",
    "Lagoon prawns",
    "Prawns",
    185000,
    "Freshly landed. Naturally sweet.",
  ],
  [
    "crab",
    "Blue lagoon crab",
    "Crab",
    220000,
    "Discover seafood from our coastal communities.",
  ],
  [
    "squid",
    "Fresh squid",
    "Squid",
    160000,
    "A fresh ingredient for your favourite recipes.",
  ],
].map(([key, name, category, price, description]) => ({
  id: "sample-" + key,
  name,
  category,
  price,
  description,
  image: "/images/" + key + ".png",
  stock: 20000,
  cleaning: 10000,
  district: "Negombo",
  seller: "Sample seller",
  sample: true,
}));
