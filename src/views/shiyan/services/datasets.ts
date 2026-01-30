import { apiClient } from "@/utils/apiClient";
import type { ProductSalesData } from "../store/experiment/types";

export const getIndustries = async (): Promise<string[]> => {
  return await apiClient.get<string[]>("/datasets/industries");
};

export const getCompanies = async (industry: string): Promise<string[]> => {
  return await apiClient.get<string[]>(`/datasets/industries/${industry}/companies`);
};

export const getProducts = async (industry: string, company: string): Promise<string[]> => {
  return await apiClient.get<string[]>(
    `/datasets/industries/${industry}/companies/${company}/products`,
  );
};

export const getProductSalesData = async (
  industry: string,
  company: string,
  product: string,
): Promise<ProductSalesData> => {
  return await apiClient.get<ProductSalesData>(
    `/datasets/industries/${industry}/companies/${company}/products/${product}/sales`,
  );
};

export const getProductFieldOptions = async (
  industry: string,
  company: string,
  product: string,
): Promise<string[]> => {
  const response = await apiClient.get<{ fields: string[] }>(
    `/datasets/industries/${industry}/companies/${company}/products/${product}/fields`,
  );
  return Array.isArray(response?.fields) ? response.fields : [];
};
