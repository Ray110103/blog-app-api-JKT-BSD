import { ORIGIN_CITY_NAME, ORIGIN_POSTAL_CODE, ORIGIN_PROVINCE, PACKAGING_FEE } from "../config/env";
import { BisteshipService } from "./biteship.service";

export class ShippingService {
  private biteship: BisteshipService;
  private packagingFee: number;

  constructor() {
    this.biteship = new BisteshipService();
    this.packagingFee = PACKAGING_FEE;
  }

  /**
   * Get all provinces from Biteship
   */
  getProvinces = async () => {
    return await this.biteship.getProvinces();
  };

  /**
   * Get cities by province ID
   */
  getCities = async (provinceId: number) => {
    return await this.biteship.getCities(provinceId);
  };

  /**
   * Get all cities (no filter)
   */
  getAllCities = async () => {
    return await this.biteship.getAllCities();
  };

  /**
   * Calculate shipping cost for multiple couriers
   * Returns formatted data with packaging fee included
   */
  calculateShippingCost = async (params: {
    destinationPostalCode: string;
    weight: number;
    couriers?: string[];
  }) => {
    // Get shipping costs from Biteship
    const courierResults = await this.biteship.getAllCouriersCost({
      destinationPostalCode: params.destinationPostalCode,
      weight: params.weight,
      couriers: params.couriers || ["jne", "tiki", "pos"],
    });

    // Format response for frontend
    const formattedResults = courierResults.map((courier) => ({
      code: courier.code,
      name: courier.name,
      services: courier.costs.map((cost) => ({
        service: cost.service,
        description: cost.description,
        cost: cost.cost[0].value,
        etd: cost.cost[0].etd,
        note: cost.cost[0].note,
        // Add packaging fee to shipping cost
        totalCost: cost.cost[0].value + this.packagingFee,
      })),
    }));

    return {
      couriers: formattedResults,
      packagingFee: this.packagingFee,
      origin: {
        postalCode: ORIGIN_POSTAL_CODE,
        cityName: ORIGIN_CITY_NAME,
        province: ORIGIN_PROVINCE,
      },
    };
  };
}