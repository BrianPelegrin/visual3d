// src/models/contracts.ts
// Contratos canonicos de integracion FE <-> API

import type { Building, DetailedUnit, Project, User } from './types';

export interface ApiEnvelope<T> {
  data?: T;
  items?: T;
  result?: T;
}

export interface ApiAuthLoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type ApiAuthMeResponse = User;

export type ApiProjectsResponse = Project[] | ApiEnvelope<Project[]>;
export type ApiUsersResponse = User[] | ApiEnvelope<User[]>;
export type ApiSheetsResponse = string[] | ApiEnvelope<string[]>;

export interface ApiProjectLayoutPayload {
  projectId?: string;
  gridSize?: number;
  buildings?: Building[];
}

export interface ApiProjectLayoutResponse extends ApiProjectLayoutPayload {
  layout?: ApiProjectLayoutPayload;
}

// Contrato recomendado para apartments (payload real ya llega con variantes de mayusculas)
export interface ApiApartmentRecord {
  id?: number | string;
  Id?: number | string;
  codUnidad?: string;
  CodUnidad?: string;
  codigoUnidad?: string;
  CodigoUnidad?: string;
  edificio?: string;
  Edificio?: string;
  unidad?: string | number;
  Unidad?: string | number;
  metraje?: number | string;
  Metraje?: number | string;
  estado?: string;
  Estado?: string;
  nombre?: string;
  Nombre?: string;
  telefono?: string;
  Telefono?: string;
  correo?: string;
  Correo?: string;
  cedula?: string;
  Cedula?: string;
  precio?: number | string;
  Precio?: number | string;
  inicial?: number | string | null;
  Inicial?: number | string | null;
  inicialDolar?: number | string | null;
  InicialDolar?: number | string | null;
  pagado?: number | string | null;
  Pagado?: number | string | null;
  adeudado?: number | string | null;
  Adeudado?: number | string | null;
  fechaCompletaInicial?: string | null;
  FechaCompletaInicial?: string | null;
  fechaInicioVaciados?: string | null;
  FechaInicioVaciados?: string | null;
  fechaEntregaInspeccion?: string | null;
  FechaEntregaInspeccion?: string | null;
  fechaLegal?: string | null;
  FechaLegal?: string | null;
  fechaGobierno?: string | null;
  FechaGobierno?: string | null;
  fechaMicelaneos?: string | null;
  FechaMicelaneos?: string | null;
  fechaInspeccion1?: string | null;
  FechaInspeccion1?: string | null;
  fechaInspeccion2?: string | null;
  FechaInspeccion2?: string | null;
  fechaFormaPago?: string | null;
  FechaFormaPago?: string | null;
  iniciadoVaciados?: boolean | string | number | null;
  IniciadoVaciados?: boolean | string | number | null;
  enInspeccion?: boolean | string | number | null;
  EnInspeccion?: boolean | string | number | null;
  inspeccion1?: boolean | string | number | null;
  Inspeccion1?: boolean | string | number | null;
  inspeccion2?: boolean | string | number | null;
  Inspeccion2?: boolean | string | number | null;
  legal?: boolean | string | number | null;
  Legal?: boolean | string | number | null;
  gobierno?: boolean | string | number | null;
  Gobierno?: boolean | string | number | null;
  micelaneos?: boolean | string | number | null;
  Micelaneos?: boolean | string | number | null;
  titulo?: boolean | string | number | null;
  Titulo?: boolean | string | number | null;
  responsableLegal?: string;
  ResponsableLegal?: string;
  responsableGobierno?: string;
  ResponsableGobierno?: string;
  responsableMicelaneos?: string;
  ResponsableMicelaneos?: string;
  formaPago?: string;
  FormaPago?: string;
  banco?: string;
  Banco?: string;
  saldo?: boolean | string | number | null;
  Saldo?: boolean | string | number | null;
  entregada?: boolean | string | number | null;
  Entregada?: boolean | string | number | null;
  descargadaDGII?: boolean | string | number | null;
  DescargadaDGII?: boolean | string | number | null;
}

export type ApiApartmentsResponse =
  | ApiApartmentRecord[]
  | ApiEnvelope<ApiApartmentRecord[]>
  | { apartments?: ApiApartmentRecord[]; detailedUnits?: ApiApartmentRecord[] };

export type CanonicalApartment = DetailedUnit;

export interface ApiApartmentStatsResponse {
  projectId: string;
  edificios: number;
  vendida: number;
  totalUnidades: number;
  unidadesEntregadas: number;
  unidadesConSaldo: number;
  unidadesEnInspeccion: number;
  disponiblesObservacion: number;
}
