export interface ISubProduct {
  id: string;
  name: string;
  description: string;
  minInvestment: number;
  expectedReturn: string;
}

export interface IProduct {
  title: string;
  description: string;
  riskLevel: "High" | "Medium" | "Low";
  imageUrl: string;
  features: string[];
  subProducts: ISubProduct[];
}
