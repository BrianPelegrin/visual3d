// src/models/types.ts

export type UnitStatus = 'available' | 'reserved' | 'sold' | 'maintenance' | 'delivered' | 'financing' | 'inspection' | 'observation';

export interface Unit {
    id: string;
    detailedUnitId: number | null; // ID of the DetailedUnit record
    buildingId: string;
    name: string;
    codUnidad?: string;
    detailedUnitCode?: string;
    externalUnitCode?: string;
    status: UnitStatus;
    paid: boolean;
    price?: number;
    balance?: number;
    deliveryDate?: string; // ISO format: YYYY-MM-DD
    bank?: string;
    floor?: number;
    hasDebt?: boolean;
    enInspeccion?: boolean;
    legal?: boolean;
    titulo?: boolean;
    descargadaDGII?: boolean;
    saldo?: boolean;
}

export interface Building {
    id: string;
    projectId: string;
    name: string;
    position: { x: number, z: number };
    dimensions: { width: number, depth: number, height: number };
    rotationY: number;
    units: Unit[];
}

export interface Blueprint {
    url: string;
    width: number;
    height: number;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
    id: number;
    codigo?: string | null;
    name: string;
    email: string;
    role: UserRole;
    password?: string;
    avatar?: string;
}

export interface Project {
    id: string;
    nombre: string;
    direccion: string;
    provincia: string;
    municipio: string;
    imagenPlano: string;
}

export interface DetailedUnit {
    id: number;
    codUnidad: string;
    edificio: string;
    unidad: string;
    metraje: number;
    estado: string; // "Vendido", "Disponible", "Intercambio", ""
    nombre: string;
    telefono: string;
    correo: string;
    cedula: string;
    precio: number;
    inicial: number | null;
    inicialDolar: number | null;
    pagado: number | null;
    adeudado: number | null;
    fechaCompletaInicial: string | null;
    fechaInicioVaciados: string | null;
    fechaEntregaInspeccion: string | null;
    fechaLegal: string | null;
    fechaGobierno: string | null;
    fechaMicelaneos: string | null;
    fechaInspeccion1: string | null;
    fechaInspeccion2: string | null;
    fechaFormaPago: string | null;
    iniciadoVaciados: boolean | null;
    enInspeccion: boolean | null;
    inspeccion1: boolean | null;
    inspeccion2: boolean | null;
    legal: boolean | null;
    gobierno: boolean | null;
    micelaneos: boolean | null;
    titulo: boolean | null;
    responsableLegal: string;
    responsableGobierno: string;
    responsableMicelaneos: string;
    formaPago: string; // "", "Financiado", "Fondos Propios"
    banco: string;
    saldo: boolean | null;
    entregada: boolean | null;
    descargadaDGII: boolean | null;
}
