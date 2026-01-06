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
    this.baseUrl =
      process.env.RAJAONGKIR_BASE_URL || "https://rajaongkir.komerce.id/api/v1";

    this.shippingClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        key: process.env.RAJAONGKIR_SHIPPING_KEY!,
      },
    });

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

      for (const term of searchTerms) {
        try {
          const response = await this.shippingClient.get(
            "/destination/domestic-destination",
            {
              params: {
                search: term,
                limit: 500,
                offset: 0,
              },
            }
          );

          if (response.data.meta.code === 200) {
            allDestinations.push(...response.data.data);
            console.log(
              `✅ Fetched ${response.data.data.length} destinations for "${term}"`
            );
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch data for "${term}"`);
        }
      }

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

      console.log(
        `✅ Found ${provinces.length} unique provinces from ${allDestinations.length} destinations`
      );
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
   * ⭐ FIXED: Query-priority search with backend filtering
   */
  searchCities = async (filters: SearchCityDto) => {
    try {
      console.log("🔍 Searching cities with filters:", filters);

      const params: any = {
        limit: 500,
        offset: 0,
      };

      // ⭐ STRATEGY: If user searching, use query ONLY (ignore province in API search)
      // Then filter by province after getting results
      if (filters.query) {
        params.search = filters.query;
        console.log(`🔎 Searching by query: "${filters.query}"`);
      } else if (filters.provinceId) {
        params.search = filters.provinceId;
        console.log(`🔎 Searching by province: "${filters.provinceId}"`);
      } else {
        params.search = "indonesia";
        console.log(`🔎 Default search: "indonesia"`);
      }

      const response = await this.shippingClient.get(
        "/destination/domestic-destination",
        {
          params,
        }
      );

      if (response.data.meta.code !== 200) {
        throw new ApiError(
          response.data.meta.message || "Failed to fetch cities",
          response.data.meta.code
        );
      }

      let destinations: RajaOngkirDestination[] = response.data.data;

      // ⭐ BACKEND FILTERING: If province filter exists, filter results
      if (filters.provinceId) {
        destinations = destinations.filter((dest) =>
          dest.province_name
            .toLowerCase()
            .includes(filters.provinceId!.toLowerCase())
        );
        console.log(
          `✅ Filtered to ${destinations.length} cities in province "${filters.provinceId}"`
        );
      }

      // ⭐ Transform to standardized format
      const cities = destinations.map((dest: RajaOngkirDestination) => ({
        city_id: dest.id,
        province_id: dest.province_name,
        province: dest.province_name,
        type: this.extractCityType(dest.city_name),
        city_name: dest.city_name, // ⭐ Use original city_name (already clean!)
        postal_code: dest.postal_code || "",
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

      for (const term of searchTerms) {
        try {
          const response = await this.shippingClient.get(
            "/destination/domestic-destination",
            {
              params: {
                search: term,
                limit: 500,
                offset: 0,
              },
            }
          );

          if (response.data.meta.code === 200) {
            const dest: RajaOngkirDestination | undefined =
              response.data.data.find(
                (d: RajaOngkirDestination) => d.id === cityId
              );

            if (dest) {
              const city = {
                city_id: dest.id,
                province_id: dest.province_name,
                province: dest.province_name,
                type: this.extractCityType(dest.city_name),
                city_name: dest.city_name, // ⭐ Use original city_name
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
          continue;
        }
      }

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

      const formData = new URLSearchParams();
      formData.append("origin", data.originCityId.toString());
      formData.append("destination", data.destinationCityId.toString());
      formData.append("weight", data.weight.toString());
      formData.append("courier", data.courier.toLowerCase());

      console.log("📤 Request endpoint: /calculate/domestic-cost");
      console.log("📤 Request params:", formData.toString());

      const response = await this.shippingClient.post(
        "/calculate/domestic-cost",
        formData
      );

      console.log("📥 Response:", response.data);

      if (response.data.meta?.code !== 200) {
        throw new ApiError(
          response.data.meta?.message || "Failed to calculate shipping cost",
          response.data.meta?.code || 500
        );
      }

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

  trackPackage = async (data: TrackPackageDto) => {
    try {
      console.log("📦 Tracking package:", data.waybill);

      // ✅ FIXED: Build query parameters
      const params = new URLSearchParams();
      params.append("awb", data.waybill);
      params.append("courier", data.courier.toLowerCase());
      params.append("last_phone_number", data.lastPhoneNumber); // ✅ REQUIRED: Always send

      console.log("📤 Request URL:", `/track/waybill?${params.toString()}`);

      // ✅ Send as query parameters, not body
      const response = await this.trackingClient.post(
        `/track/waybill?${params.toString()}`,
        {} // Empty body
      );

      console.log("📥 Response status:", response.data.meta?.code || response.data.status?.code);

      // Handle both response formats
      if (response.data.meta?.code === 200 || response.data.status?.code === 200) {
        console.log("✅ Package tracking retrieved successfully");
        return response.data.data;
      }

      throw new ApiError(
        response.data.meta?.message || 
        response.data.status?.description || 
        "Failed to track package",
        response.data.meta?.code || 
        response.data.status?.code || 
        500
      );
    } catch (error: any) {
      console.error("❌ Error tracking package:", error.message);
      console.error("❌ Error response:", error.response?.data);
      
      if (error instanceof ApiError) throw error;
      
      throw new ApiError(
        error.response?.data?.meta?.message ||
        error.response?.data?.status?.description || 
        "Failed to track package",
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
    return "Kota";
  };

  /**
   * HELPER: Format city display name
   */
  formatCityName = (city: any): string => {
    return city.label || `${city.type} ${city.city_name}`;
  };

  /**
   * HELPER: Get cheapest shipping option
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
   */
  getAllShippingOptions = (shippingOptions: RajaOngkirShippingOption[]) => {
    if (!shippingOptions || shippingOptions.length === 0) {
      return [];
    }

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
