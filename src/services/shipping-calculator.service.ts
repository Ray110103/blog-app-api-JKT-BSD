import { ApiError } from "../utils/api-error";
import { BisteshipService } from "./biteship.service";
import { RajaOngkirService } from "../modules/rajaongkir/rajaongkir.service";

type AddressLike = {
  postalCode: string;
  cityName?: string | null;
  provinceName?: string | null;
  districtName?: string | null;
  subdistrictName?: string | null;
};

type ShippingOption = {
  name: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

export class ShippingCalculatorService {
  private rajaOngkir: RajaOngkirService;
  private biteship: BisteshipService;

  constructor() {
    this.rajaOngkir = new RajaOngkirService();
    this.biteship = new BisteshipService();
  }

  private isRateLimited(error: any) {
    const status = error?.statusCode || error?.status || error?.response?.status;
    const message = String(error?.message || "");
    return status === 429 || /daily limit|rate limit|too many/i.test(message);
  }

  private async calculateWithBiteship(params: {
    address: AddressLike;
    weight: number;
    courier: string;
  }): Promise<ShippingOption[]> {
    const courierString = params.courier.replace(/:/g, ",");
    const originPostalCode = process.env.ORIGIN_POSTAL_CODE;
    if (!originPostalCode) throw new ApiError("Origin postal code is not configured", 500);

    try {
      const pricing = await this.biteship.getRatesByAreaIds({
        originPostalCode,
        destinationPostalCode: params.address.postalCode,
        weight: params.weight,
        couriers: courierString,
      });

      return pricing.map((p) => ({
        name: p.courier_name,
        code: p.courier_code,
        service: p.courier_service_code,
        description: p.courier_service_name,
        cost: p.price,
        etd: p.shipment_duration_range || p.duration,
      }));
    } catch {
      // Final fallback: legacy postal-code based rates
      const courierResults = await this.biteship.getShippingCost({
        destinationPostalCode: params.address.postalCode,
        weight: params.weight,
        courier: courierString,
      });

      return courierResults.flatMap((c) =>
        c.costs.map((svc) => ({
          name: c.name,
          code: c.code,
          service: svc.service,
          description: svc.description,
          cost: svc.cost[0].value,
          etd: svc.cost[0].etd,
        }))
      );
    }
  }

  /**
   * RajaOngkir first. If rate-limited, fallback to Biteship.
   */
  async calculateShippingOptions(params: {
    address: AddressLike;
    weight: number;
    courier: string;
  }): Promise<ShippingOption[]> {
    try {
      const originCityId = await this.rajaOngkir.resolveOriginDestinationId();
      const destinationCityId = await this.rajaOngkir.resolveDomesticDestinationId({
        postalCode: params.address.postalCode,
        cityName: params.address.cityName ?? undefined,
        provinceName: params.address.provinceName ?? undefined,
        districtName: params.address.districtName ?? undefined,
        subdistrictName: params.address.subdistrictName ?? undefined,
      });

      return await this.rajaOngkir.calculateCost({
        originCityId,
        destinationCityId,
        weight: params.weight,
        courier: params.courier,
      });
    } catch (error: any) {
      if (this.isRateLimited(error)) {
        return await this.calculateWithBiteship(params);
      }
      throw error;
    }
  }
}

