import axios, { AxiosInstance } from "axios";
import { ApiError } from "../../utils/api-error";
import { CalculateCostDto } from "./dto/calculate-cost.dto";
import { SearchCityDto } from "./dto/search-city.dto";
import { TrackPackageDto } from "./dto/track-package.dto";

interface RajaOngkirMeta {
  code: number;
  message: string;
}

interface RajaOngkirApiResponse<T> {
  meta: RajaOngkirMeta;
  data: T;
}

interface RajaOngkirProvince {
  id: number;
  name: string;
}

interface RajaOngkirCity {
  id: number;
  name: string;
  postal_code?: string;
}

interface RajaOngkirDistrict {
  id: number;
  name: string;
}

interface RajaOngkirSubdistrict {
  id: number;
  name: string;
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

    const apiKey =
      process.env.RAJAONGKIR_API_KEY ||
      process.env.RAJAONGKIR_SHIPPING_KEY ||
      process.env.RAJAONGKIR_TRACKING_KEY;

    if (!apiKey) {
      throw new Error("RAJAONGKIR_API_KEY is required");
    }

    this.shippingClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        key: apiKey,
      },
    });

    this.trackingClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        key: apiKey,
      },
    });
  }

  /**
   * Get all provinces
   */
  getProvinces = async () => {
    try {
      const response = await this.shippingClient.get<
        RajaOngkirApiResponse<RajaOngkirProvince[]>
      >("/destination/province");

      if (response.data.meta.code !== 200) {
        throw new ApiError(
          response.data.meta.message || "Failed to fetch provinces",
          response.data.meta.code
        );
      }

      return response.data.data
        .map((p) => ({
          province_id: p.id,
          province: p.name,
        }))
        .sort((a, b) => a.province.localeCompare(b.province));
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.response?.data?.meta?.message || "Failed to fetch provinces",
        error.response?.status || 500
      );
    }
  };

  /**
   * Get province by ID or name
   */
  getProvinceById = async (provinceName: string) => {
    try {
      const provinces = await this.getProvinces();
      const province = provinces.find(
        (p) => String(p.province_id).toLowerCase() === provinceName.toLowerCase()
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
   * Search cities by province ID, then optionally filter by query
   */
  searchCities = async (filters: SearchCityDto) => {
    try {
      if (!filters.provinceId) {
        return [];
      }

      const response = await this.shippingClient.get<
        RajaOngkirApiResponse<RajaOngkirCity[]>
      >(`/destination/city/${filters.provinceId}`);

      if (response.data.meta.code !== 200) {
        throw new ApiError(
          response.data.meta.message || "Failed to fetch cities",
          response.data.meta.code
        );
      }

      const query = (filters.query || "").trim().toLowerCase();

      return response.data.data
        .filter((c) =>
          query ? c.name.toLowerCase().includes(query) : true
        )
        .map((c) => ({
          city_id: c.id,
          province_id: String(filters.provinceId),
          province: String(filters.provinceId),
          type: "City",
          city_name: c.name,
          postal_code: c.postal_code || "",
        }));
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.response?.data?.meta?.message || "Failed to search cities",
        error.response?.status || 500
      );
    }
  };

  /**
   * List districts by city ID, then optionally filter by query
   */
  searchDistricts = async ({
    cityId,
    query,
  }: {
    cityId: number;
    query?: string;
  }) => {
    try {
      const response = await this.shippingClient.get<
        RajaOngkirApiResponse<RajaOngkirDistrict[]>
      >(`/destination/district/${cityId}`);

      if (response.data.meta.code !== 200) {
        throw new ApiError(
          response.data.meta.message || "Failed to fetch districts",
          response.data.meta.code
        );
      }

      const q = (query || "").trim().toLowerCase();
      return response.data.data
        .filter((d) => (q ? d.name.toLowerCase().includes(q) : true))
        .map((d) => ({ district_id: d.id, district_name: d.name }));
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.response?.data?.meta?.message || "Failed to search districts",
        error.response?.status || 500
      );
    }
  };

  /**
   * List sub-districts by district ID
   */
  searchSubdistricts = async (districtId: number) => {
    try {
      const response = await this.shippingClient.get<
        RajaOngkirApiResponse<RajaOngkirSubdistrict[]>
      >(`/destination/sub-district/${districtId}`);

      if (response.data.meta.code !== 200) {
        throw new ApiError(
          response.data.meta.message || "Failed to fetch sub-districts",
          response.data.meta.code
        );
      }

      return response.data.data.map((s) => ({
        subdistrict_id: s.id,
        subdistrict_name: s.name,
      }));
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.response?.data?.meta?.message || "Failed to search sub-districts",
        error.response?.status || 500
      );
    }
  };

  /**
   * Get city by ID
   */
  getCityById = async (cityId: number) => {
    try {
      throw new ApiError(
        "City lookup by ID is not supported without province context",
        400
      );
    } catch (error: any) {
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
      const formData = new URLSearchParams();
      formData.append("origin", data.originCityId.toString());
      formData.append("destination", data.destinationCityId.toString());
      formData.append("weight", data.weight.toString());
      formData.append("courier", data.courier.toLowerCase());

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
