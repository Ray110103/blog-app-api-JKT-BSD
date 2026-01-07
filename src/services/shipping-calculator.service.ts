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

  private isRajaOngkirUnavailable(error: any) {
    const status = error?.statusCode || error?.status || error?.response?.status;
    const message = String(error?.message || "");

    // Komerce sometimes returns 400 with auth-related message.
    if (/invalid api key|key not found|api key is required/i.test(message)) return true;

    // Missing config thrown from constructor.
    if (/rajaongkir_api_key is required/i.test(message)) return true;

    // Treat explicit auth statuses as unavailable.
    if (status === 401 || status === 403) return true;

    return false;
  }

  private log(message: string, meta?: Record<string, unknown>) {
    // Keep logs concise and avoid secrets.
    if (meta) {
      console.log(`🚚 ${message}`, meta);
      return;
    }
    console.log(`🚚 ${message}`);
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
      this.log("Calculating shipping (provider=rajaongkir)", {
        courier: params.courier,
        weight: params.weight,
        postalCode: params.address.postalCode,
      });
      const originCityId = await this.rajaOngkir.resolveOriginDestinationId();
      const destinationCityId = await this.rajaOngkir.resolveDomesticDestinationId({
        postalCode: params.address.postalCode,
        cityName: params.address.cityName ?? undefined,
        provinceName: params.address.provinceName ?? undefined,
        districtName: params.address.districtName ?? undefined,
        subdistrictName: params.address.subdistrictName ?? undefined,
      });

      const options = await this.rajaOngkir.calculateCost({
        originCityId,
        destinationCityId,
        weight: params.weight,
        courier: params.courier,
      });
      this.log("Shipping calculated (provider=rajaongkir)", {
        options: options.length,
      });
      return options;
    } catch (error: any) {
      if (this.isRateLimited(error) || this.isRajaOngkirUnavailable(error)) {
        const reason = this.isRateLimited(error) ? "rate-limited" : "unavailable";
        this.log(`RajaOngkir ${reason}; falling back to biteship`, {
          reason: String(error?.message || ""),
        });
        const options = await this.calculateWithBiteship(params);
        this.log("Shipping calculated (provider=biteship)", {
          options: options.length,
        });
        return options;
      }
      this.log("Shipping failed (provider=rajaongkir)", {
        status: error?.statusCode || error?.status || error?.response?.status,
        message: String(error?.message || ""),
      });
      throw error;
    }
  }
}
