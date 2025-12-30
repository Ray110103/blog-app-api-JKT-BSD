import axios, { AxiosInstance } from "axios";
import { ApiError } from "../../utils/api-error";
import { CalculateCostDto } from "./dto/calculate-cost.dto";
import { SearchCityDto } from "./dto/search-city.dto";
import { TrackPackageDto } from "./dto/track-package.dto";

interface RajaOngkirDestination {
  id: number;
  label: string;
  city_name: string;
  province_name: string;
  district_name: string;
  subdistrict_name: string;
  postal_code?: string;
}

// ⭐ RajaOngkir Komerce Response Structure
interface RajaOngkirShippingOption {
  name: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export class RajaOngkirService {
  private shippingClient: AxiosInstance;
  private trackingClient: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.RAJAONGKIR_BASE_URL || "https://rajaongkir.komerce.id/api/v1";

    // Client for shipping cost calculation
    this.shippingClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        key: process.env.RAJAONGKIR_SHIPPING_KEY!,
      },
    });

    // Client for tracking packages
    this.trackingClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        key: process.env.RAJAONGKIR_TRACKING_KEY!,
      },
    });
  }

  /**
   * Get all provinces (extracted from domestic destinations)
   */
  getProvinces = async () => {
    try {
      console.log("📍 Fetching provinces from RajaOngkir API...");

      // ⭐ Use multiple search terms to get comprehensive results
      const searchTerms = [
        "jakarta",
        "jawa",
        "sumatera",
        "kalimantan",
        "sulawesi",
        "bali",
        "nusa tenggara",
        "maluku",
        "papua",
      ];

      const allDestinations: RajaOngkirDestination[] = [];
      const provincesMap = new Map<string, any>();

      // Fetch data for each search term
      for (const term of searchTerms) {
        try {
          const response = await this.shippingClient.get("/destination/domestic-destination", {
            params: {
              search: term,
              limit: 500,
              offset: 0,
            },
          });

          if (response.data.meta.code === 200) {
            allDestinations.push(...response.data.data);
            console.log(`✅ Fetched ${response.data.data.length} destinations for "${term}"`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch data for "${term}"`);
        }
      }

      // Extract unique provinces
      allDestinations.forEach((dest) => {
        if (!provincesMap.has(dest.province_name)) {
          provincesMap.set(dest.province_name, {
            province_id: dest.province_name,
            province: dest.province_name,
          });
        }
      });

      const provinces = Array.from(provincesMap.values()).sort((a, b) =>
        a.province.localeCompare(b.province)
      );

      console.log(`✅ Found ${provinces.length} unique provinces from ${allDestinations.length} destinations`);
      return provinces;
    } catch (error: any) {
      console.error("❌ Error fetching provinces:", error.message);
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.response?.data?.meta?.message || "Failed to fetch provinces",
        error.response?.status || 500
      );
    }
  };

  /**
   * Get province by name
   */
  getProvinceById = async (provinceName: string) => {
    try {
      const provinces = await this.getProvinces();
      const province = provinces.find(
        (p) => p.province_id.toLowerCase() === provinceName.toLowerCase()
      );

      if (!province) {
        throw new ApiError("Province not found", 404);
      }

      return province;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.response?.data?.meta?.message || "Failed to fetch province",
        error.response?.status || 500
      );
    }
  };

  /**
   * Search cities/destinations
   */
  searchCities = async (filters: SearchCityDto) => {
    try {
      console.log("🔍 Searching cities with filters:", filters);

      const params: any = {
        limit: 500,
        offset: 0,
      };

      // Build search query
      const searchTerms: string[] = [];

      if (filters.provinceId) {
        searchTerms.push(filters.provinceId);
      }

      if (filters.query) {
        searchTerms.push(filters.query);
      }

      // ⭐ IMPORTANT: search parameter is required, use default if empty
      if (searchTerms.length > 0) {
        params.search = searchTerms.join(" ");
      } else {
        params.search = "indonesia"; // Default search
      }

      const response = await this.shippingClient.get("/destination/domestic-destination", {
        params,
      });

      if (response.data.meta.code !== 200) {
        throw new ApiError(
          response.data.meta.message || "Failed to fetch cities",
          response.data.meta.code
        );
      }

      // Transform to standardized format
      const cities = response.data.data.map((dest: RajaOngkirDestination) => ({
        city_id: dest.id,
        province_id: dest.province_name,
        province: dest.province_name,
        type: this.extractCityType(dest.city_name),
        city_name: this.cleanCityName(dest.city_name),
        postal_code: dest.postal_code || "",
        // Additional info
        label: dest.label,
        district_name: dest.district_name,
        subdistrict_name: dest.subdistrict_name,
        full_address: dest.label,
      }));

      console.log(`✅ Found ${cities.length} cities`);
      return cities;
    } catch (error: any) {
      console.error("❌ Error searching cities:", error.message);
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.response?.data?.meta?.message || "Failed to search cities",
        error.response?.status || 500
      );
    }
  };

  /**
   * Get city by ID
   */
  getCityById = async (cityId: number) => {
    try {
      console.log("🔍 Fetching city by ID:", cityId);

      // ⭐ Use search with multiple terms
      const searchTerms = [
        "jakarta",
        "jawa",
        "sumatera",
        "kalimantan",
        "sulawesi",
        "bali",
        "nusa tenggara",
        "maluku",
        "papua",
      ];

      // Search through all terms to find the city
      for (const term of searchTerms) {
        try {
          const response = await this.shippingClient.get("/destination/domestic-destination", {
            params: {
              search: term,
              limit: 500,
              offset: 0,
            },
          });

          if (response.data.meta.code === 200) {
            const dest: RajaOngkirDestination | undefined = response.data.data.find(
              (d: RajaOngkirDestination) => d.id === cityId
            );

            if (dest) {
              // Found it!
              const city = {
                city_id: dest.id,
                province_id: dest.province_name,
                province: dest.province_name,
                type: this.extractCityType(dest.city_name),
                city_name: this.cleanCityName(dest.city_name),
                postal_code: dest.postal_code || "",
                label: dest.label,
                district_name: dest.district_name,
                subdistrict_name: dest.subdistrict_name,
                full_address: dest.label,
              };

              console.log("✅ Found city:", city.city_name);
              return city;
            }
          }
        } catch (error) {
          // Continue to next search term
          continue;
        }
      }

      // City not found in any search results
      throw new ApiError("City not found", 404);
    } catch (error: any) {
      console.error("❌ Error fetching city:", error.message);
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.response?.data?.meta?.message || "Failed to fetch city",
        error.response?.status || 500
      );
    }
  };

  /**
   * Calculate shipping cost
   */
  calculateCost = async (data: CalculateCostDto) => {
    try {
      console.log("💰 Calculating shipping cost:", data);

      // Prepare form data
      const formData = new URLSearchParams();
      formData.append("origin", data.originCityId.toString());
      formData.append("destination", data.destinationCityId.toString());
      formData.append("weight", data.weight.toString());
      formData.append("courier", data.courier.toLowerCase());

      console.log("📤 Request endpoint: /calculate/domestic-cost");
      console.log("📤 Request params:", formData.toString());

      const response = await this.shippingClient.post("/calculate/domestic-cost", formData);

      console.log("📥 Response:", response.data);

      if (response.data.meta?.code !== 200) {
        throw new ApiError(
          response.data.meta?.message || "Failed to calculate shipping cost",
          response.data.meta?.code || 500
        );
      }

      // ⭐ RajaOngkir Komerce returns array of shipping options directly
      const shippingOptions: RajaOngkirShippingOption[] = response.data.data;

      console.log(`✅ Found ${shippingOptions.length} shipping options`);
      return shippingOptions;
    } catch (error: any) {
      console.error("❌ Error calculating cost:", error.message);
      console.error("❌ Error details:", error.response?.data);

      if (error instanceof ApiError) throw error;

      throw new ApiError(
        error.response?.data?.meta?.message ||
          error.response?.data?.message ||
          "Failed to calculate shipping cost",
        error.response?.status || 500
      );
    }
  };

  /**
   * Track package by waybill/resi number
   */
  trackPackage = async (data: TrackPackageDto) => {
    try {
      console.log("📦 Tracking package:", data.waybill);

      // Prepare form data
      const formData = new URLSearchParams();
      formData.append("waybill", data.waybill);
      formData.append("courier", data.courier.toLowerCase());

      const response = await this.trackingClient.post("/waybill", formData);

      if (response.data.status?.code !== 200) {
        throw new ApiError(
          response.data.status?.description || "Failed to track package",
          response.data.status?.code || 500
        );
      }

      console.log("✅ Package tracking retrieved");
      return response.data.data;
    } catch (error: any) {
      console.error("❌ Error tracking package:", error.message);
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.response?.data?.status?.description || "Failed to track package",
        error.response?.status || 500
      );
    }
  };

  /**
   * HELPER: Extract city type from city name
   */
  private extractCityType = (cityName: string): string => {
    if (cityName.toLowerCase().includes("kota")) return "Kota";
    if (cityName.toLowerCase().includes("kabupaten")) return "Kabupaten";
    return "Kota"; // Default
  };

  /**
   * HELPER: Clean city name (remove "Kota" or "Kabupaten" prefix)
   */
  private cleanCityName = (cityName: string): string => {
    return cityName.replace(/^(Kota|Kabupaten)\s+/i, "").trim();
  };

  /**
   * HELPER: Format city display name
   */
  formatCityName = (city: any): string => {
    return city.label || `${city.type} ${city.city_name}`;
  };

  /**
   * HELPER: Get cheapest shipping option
   * ⭐ Updated for RajaOngkir Komerce response structure
   */
  getCheapestShipping = (shippingOptions: RajaOngkirShippingOption[]) => {
    if (!shippingOptions || shippingOptions.length === 0) {
      return null;
    }

    const cheapest = shippingOptions.reduce((prev, current) => {
      return current.cost < prev.cost ? current : prev;
    });

    return {
      courier: cheapest.name,
      courierCode: cheapest.code,
      service: cheapest.service,
      description: cheapest.description,
      cost: cheapest.cost,
      etd: cheapest.etd,
    };
  };

  /**
   * HELPER: Get fastest shipping option
   * ⭐ Updated for RajaOngkir Komerce response structure
   */
  getFastestShipping = (shippingOptions: RajaOngkirShippingOption[]) => {
    if (!shippingOptions || shippingOptions.length === 0) {
      return null;
    }

    const fastest = shippingOptions.reduce((prev, current) => {
      const prevDays = parseInt(prev.etd.split("-")[0]) || 999;
      const currentDays = parseInt(current.etd.split("-")[0]) || 999;
      return currentDays < prevDays ? current : prev;
    });

    return {
      courier: fastest.name,
      courierCode: fastest.code,
      service: fastest.service,
      description: fastest.description,
      cost: fastest.cost,
      etd: fastest.etd,
      etdDays: parseInt(fastest.etd.split("-")[0]) || 999,
    };
  };

  /**
   * HELPER: Get all shipping options with recommendations
   * ⭐ Updated for RajaOngkir Komerce response structure
   */
  getAllShippingOptions = (shippingOptions: RajaOngkirShippingOption[]) => {
    if (!shippingOptions || shippingOptions.length === 0) {
      return [];
    }

    // Sort by cost (cheapest first)
    return shippingOptions
      .map((option) => ({
        courier: option.name,
        courierCode: option.code,
        service: option.service,
        description: option.description,
        cost: option.cost,
        etd: option.etd,
      }))
      .sort((a, b) => a.cost - b.cost);
  };
}