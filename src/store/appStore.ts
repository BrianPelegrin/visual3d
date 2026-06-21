import { reactive } from 'vue';
import type { BlueprintTransform, Building, Unit, UnitColorSetting, UnitStatus, User, Project, DetailedUnit } from '../models/types';
import { applyEstadoColors, normalizeEstadoKey, UNIT_ESTADO_COLORS, type UnitEstadoColor } from '../scene/RulesEngine';
import type {
    ApiApartmentsResponse,
    ApiApartmentRecord,
    ApiProjectLayoutResponse,
    ApiApartmentStatsResponse,
    ApiProjectsResponse,
    ApiUsersResponse,
    ApiSheetsResponse
} from '../models/contracts';
import {
    normalizeLookupKey,
    toBooleanOrNull,
    toNumberOrNull,
    toNumberOrZero
} from '../utils/normalizers';

type AuthResponse = {
    user: User;
    accessToken: string;
    refreshToken: string;
};

type AuthSession = {
    user: User;
    accessToken: string | null;
    refreshToken: string | null;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5153/api';
const UNIT_COLORS_ENDPOINT = `${API_BASE_URL}/Settings/unit-colors`;
const AUTH_STORAGE_KEY = 'auth_session';
const AUTH_RETURN_TO_KEY = 'auth_return_to';
const INITIAL_FETCH_TIMEOUT_MS = 12000;
const PROJECT_DETAIL_FETCH_TIMEOUT_MS = 45000;
let authInitializationPromise: Promise<void> | null = null;
let projectsLoadPromise: Promise<Project[]> | null = null;
let usersLoadPromise: Promise<User[]> | null = null;
let availableProjectIdsLoadPromise: Promise<string[]> | null = null;
const detailedProjectIds = new Set<string>();

export type DashboardFilterPopupState = {
    selectedFields: string[];
    values: Record<string, string>;
    ranges: Record<string, { from: string; to: string }>;
    textSelections: Record<string, string[]>;
    sortDirection: 'asc' | 'desc' | null;
};

export type DashboardFilterRouteState = {
    detailedUnitIds: number[] | null;
    popupState: DashboardFilterPopupState | null;
};

export type CameraViewState = {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    zoom: number;
};

const loadXlsx = () => import('xlsx');

const beginNetworkActivity = () => {
    appStore.networkBusyCount += 1;
};

const endNetworkActivity = () => {
    appStore.networkBusyCount = Math.max(0, appStore.networkBusyCount - 1);
};

const persistAuthSession = (session: AuthSession) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const applyAuthSession = (session: AuthSession) => {
    appStore.currentUser = session.user;
    appStore.accessToken = session.accessToken;
    appStore.refreshToken = session.refreshToken;
    appStore.isAuthenticated = true;
};

const readAuthSession = (): AuthSession | null => {
    const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!savedSession) return null;

    try {
        const session = JSON.parse(savedSession) as Partial<AuthSession>;
        const normalizedUser = normalizeUserResponse(session.user);
        if (!normalizedUser) return null;

        return {
            user: normalizedUser,
            accessToken: session.accessToken ?? null,
            refreshToken: session.refreshToken ?? null
        };
    } catch (_e) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
};

const normalizeUserRole = (value: unknown): User['role'] => {
    const role = String(value ?? '').trim().toLowerCase();
    if (role === 'admin') return 'admin';
    if (role === 'editor') return 'editor';
    if (role === 'ventas' || role === 'sales') return 'ventas';
    return 'viewer';
};

const normalizeUserResponse = (payload: unknown): User | null => {
    if (!payload || typeof payload !== 'object') return null;

    const candidate = payload as { user?: Partial<User> & { id?: unknown } } & Partial<User> & { id?: unknown };

    const normalizeId = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
            return Number(value);
        }
        if (typeof value === 'string') {
            const digitMatch = value.match(/\d+/g);
            if (digitMatch) {
                const parsed = Number(digitMatch.join(''));
                return Number.isFinite(parsed) ? parsed : null;
            }
        }
        return null;
    };

    if (candidate.user && candidate.user.id != null) {
        const normalizedId = normalizeId(candidate.user.id);
        if (normalizedId === null) return null;
        return {
            ...(candidate.user as User),
            id: normalizedId,
            role: normalizeUserRole(candidate.user.role)
        };
    }

    const normalizedId = normalizeId(candidate.id);
    if (normalizedId !== null && candidate.name && candidate.email && candidate.role) {
        return {
            ...(candidate as User),
            id: normalizedId,
            role: normalizeUserRole(candidate.role)
        };
    }

    return null;
};

const getAuthHeaders = () => {
    const headers: Record<string, string> = {};
    if (appStore.accessToken) {
        headers.Authorization = `Bearer ${appStore.accessToken}`;
    }
    return headers;
};

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = INITIAL_FETCH_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal
        });
    } finally {
        window.clearTimeout(timeoutId);
    }
};

const isUnauthorizedResponse = (response: Response) => response.status === 401;

const handleUnauthorizedResponse = (response: Response) => {
    if (!isUnauthorizedResponse(response)) return false;
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (returnTo && returnTo !== '/login') {
        sessionStorage.setItem(AUTH_RETURN_TO_KEY, returnTo);
    }
    appStore.currentUser = null;
    appStore.accessToken = null;
    appStore.refreshToken = null;
    appStore.isAuthenticated = false;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (window.location.pathname !== '/login') {
        window.location.assign('/login?reason=expired');
    }
    return true;
};

export const consumeAuthReturnTo = () => {
    const returnTo = sessionStorage.getItem(AUTH_RETURN_TO_KEY);
    if (returnTo) {
        sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
    }
    return returnTo;
};

const syncProjectsState = (projects: Project[]) => {
    appStore.projects = projects.map((project) => {
        const existingProject = appStore.projects.find(item => item.id === project.id);
        if (!existingProject) return project;

        const incomingBlueprint = (project as Partial<Project>).imagenPlano;
        return {
            ...existingProject,
            ...project,
            imagenPlano: incomingBlueprint || existingProject.imagenPlano
        };
    });
};

const upsertProjectState = (project: Project) => {
    const index = appStore.projects.findIndex(item => item.id === project.id);
    detailedProjectIds.add(project.id);
    if (index >= 0) {
        appStore.projects[index] = project;
    } else {
        appStore.projects.push(project);
    }
};

const syncProjectLayoutState = (projectId: string, buildings: Building[], gridSize?: number, blueprintTransform?: BlueprintTransform | null) => {
    const preservedBuildings = appStore.buildings.filter(building => building.projectId !== projectId);
    appStore.buildings = [...preservedBuildings, ...buildings];

    if (typeof gridSize === 'number') {
        appStore.gridSize = gridSize;
    }

    appStore.blueprintTransform = blueprintTransform ?? null;
};

const clearProjectLayoutState = (projectId: string) => {
    appStore.buildings = appStore.buildings.filter(building => building.projectId !== projectId);
};

const clearProjectApartmentState = () => {
    appStore.detailedUnits = [];
};

const syncCurrentProjectApartments = (projectId: string | null) => {
    if (!projectId) {
        appStore.detailedUnits = [];
        return;
    }
    appStore.detailedUnits = appStore.detailedUnitsByProject[projectId] ?? [];
};

const normalizeProjectsResponse = (payload: unknown): Project[] => {
    const source = payload as ApiProjectsResponse & { projects?: Project[] };
    if (Array.isArray(source)) return source;
    if (!source || typeof source !== 'object') return [];
    return source.projects ?? source.data ?? source.items ?? source.result ?? [];
};

const normalizeUsersResponse = (payload: unknown): User[] => {
    const source = payload as ApiUsersResponse & { users?: User[] };
    const users = Array.isArray(source)
        ? source
        : (!source || typeof source !== 'object')
            ? []
            : (source.users ?? source.data ?? source.items ?? source.result ?? []);

    return users.map((user) => ({
        ...user,
        role: normalizeUserRole(user.role)
    }));
};

const normalizeStringListResponse = (payload: unknown): string[] => {
    const source = payload as ApiSheetsResponse & { sheets?: unknown };
    const normalizeList = (list: unknown[]) => {
        const values = list
            .map((item) => {
                if (typeof item === 'string' || typeof item === 'number') return String(item);
                if (!item || typeof item !== 'object') return '';

                const record = item as Record<string, unknown>;
                const value = record.name
                    ?? record.Name
                    ?? record.sheet
                    ?? record.Sheet
                    ?? record.id
                    ?? record.Id;

                return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
            })
            .map((item) => item.trim())
            .filter(Boolean);

        return [...new Set(values)];
    };

    if (Array.isArray(source)) return normalizeList(source);

    if (!source || typeof source !== 'object') return [];

    const possibleLists = [source.sheets, source.data, source.items, source.result];

    for (const list of possibleLists) {
        if (Array.isArray(list)) {
            return normalizeList(list);
        }
    }

    return [];
};

const isValidHexColor = (value: unknown): value is string =>
    typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());

const normalizeHexColor = (value: unknown, fallback = '#64748b') =>
    isValidHexColor(value) ? value.trim().toLowerCase() : fallback;

const hexToNumber = (value: string) => Number.parseInt(value.replace('#', ''), 16);

const normalizeUnitColorSetting = (payload: unknown): UnitColorSetting | null => {
    if (!payload || typeof payload !== 'object') return null;

    const source = payload as Record<string, unknown>;
    const estado = String(
        source.estado
        ?? source.Estado
        ?? source.name
        ?? source.Name
        ?? source.label
        ?? source.Label
        ?? ''
    ).trim();
    const colorCss = normalizeHexColor(
        source.colorCss
        ?? source.ColorCss
        ?? source.color
        ?? source.Color
        ?? source.hex
        ?? source.Hex
    );

    if (!estado) return null;

    return {
        id: (source.id ?? source.Id ?? null) as number | string | null,
        estado,
        colorCss
    };
};

const normalizeUnitColorSettingsResponse = (payload: unknown): UnitColorSetting[] => {
    const source = payload as {
        colors?: unknown[];
        unitColors?: unknown[];
        unitStatusColors?: unknown[];
        data?: unknown[];
        items?: unknown[];
        result?: unknown[];
    };

    const list = Array.isArray(payload)
        ? payload
        : (!payload || typeof payload !== 'object')
            ? []
            : (source.colors ?? source.unitColors ?? source.unitStatusColors ?? source.data ?? source.items ?? source.result ?? []);

    if (!Array.isArray(list)) return [];

    return list
        .map(normalizeUnitColorSetting)
        .filter((item): item is UnitColorSetting => item !== null);
};

const buildEstadoColorsFromSettings = (settings: UnitColorSetting[]): Record<string, UnitEstadoColor> => {
    const estadoColors: Record<string, UnitEstadoColor> = { ...UNIT_ESTADO_COLORS };

    settings.forEach((setting) => {
        const key = normalizeEstadoKey(setting.estado);
        if (!key) return;
        estadoColors[key] = {
            label: setting.estado,
            colorCss: setting.colorCss,
            colorHex: hexToNumber(setting.colorCss)
        };
    });

    return estadoColors;
};

const syncUnitColorSettingsState = (settings: UnitColorSetting[]) => {
    appStore.unitColorSettings = settings;
    applyEstadoColors(buildEstadoColorsFromSettings(settings));
};

const defaultUnitColorSettings = (): UnitColorSetting[] =>
    Object.values(UNIT_ESTADO_COLORS).map((item) => ({
        id: null,
        estado: item.label,
        colorCss: item.colorCss
    }));

const normalizeProjectResponse = (payload: unknown): Project | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const source = payload as { project?: Project; data?: Project; item?: Project; result?: Project } & Partial<Project>;
    const candidate = source.project ?? source.data ?? source.item ?? source.result ?? source;

    if (candidate.id && candidate.nombre && candidate.direccion && candidate.provincia && candidate.municipio && candidate.imagenPlano !== undefined) {
        return candidate as Project;
    }

    return null;
};

const DEFAULT_GRID_SIZE = 300;
const DEFAULT_LAYOUT_COLS = 2;
const DEFAULT_LAYOUT_ROWS = 2;
const MAX_LAYOUT_COLS = 12;
const MAX_LAYOUT_ROWS = 12;

const normalizeGridSize = (value: unknown, fallback = DEFAULT_GRID_SIZE) => {
    const numericValue = typeof value === 'number'
        ? value
        : (typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN);

    if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue;
    }
    return fallback;
};

const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeNumber = (value: unknown, fallback: number) => {
    const numericValue = typeof value === 'number'
        ? value
        : (typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeBlueprintTransform = (value: unknown): BlueprintTransform | null => {
    if (!value || typeof value !== 'object') return null;

    const source = value as Partial<Record<keyof BlueprintTransform, unknown>>;
    const width = normalizeNumber(source.width, 0);
    const depth = normalizeNumber(source.depth, 0);
    if (width <= 0 || depth <= 0) return null;

    return {
        x: normalizeNumber(source.x, 0),
        z: normalizeNumber(source.z, 0),
        width,
        depth,
        rotationY: normalizeNumber(source.rotationY, 0),
        opacity: clampNumber(normalizeNumber(source.opacity, 1), 0.15, 1)
    };
};

const normalizeLayoutDimension = (value: unknown, fallback: number, max: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.min(max, Math.max(1, Math.round(value)));
    }
    return fallback;
};

const getUnitsPerFloor = (layoutCols: number, layoutRows: number) => layoutCols * layoutRows;

const getDefaultFloorAndSlot = (index: number, unitsPerFloor: number) => {
    const floor = Math.floor(index / unitsPerFloor) + 1;
    const slot = index % unitsPerFloor;
    return { floor, slot };
};

const normalizeUnitsFloorSlots = (units: Unit[], unitsPerFloor: number) => units.map((unit, index) => {
    const fallback = getDefaultFloorAndSlot(index, unitsPerFloor);
    return {
        ...unit,
        floor: typeof unit.floor === 'number' && unit.floor > 0 ? unit.floor : fallback.floor,
        slot: typeof unit.slot === 'number' && unit.slot >= 0 && unit.slot < unitsPerFloor ? unit.slot : fallback.slot
    };
});

const getNextUnitFloorAndSlot = (units: Unit[], unitsPerFloor: number) => {
    const occupied = new Set(units.map(unit => `${unit.floor}:${unit.slot}`));
    const maxFloor = units.reduce((max, unit) => Math.max(max, unit.floor || 1), 1);

    for (let floor = 1; floor <= maxFloor + 1; floor++) {
        for (let slot = 0; slot < unitsPerFloor; slot++) {
            if (!occupied.has(`${floor}:${slot}`)) {
                return { floor, slot };
            }
        }
    }

    return { floor: maxFloor + 1, slot: 0 };
};

const createAutoUnit = (buildingId: string, index: number, floor: number, slot: number): Unit => ({
    id: `unt_${generateId()}`,
    detailedUnitId: null,
    buildingId,
    name: `Apto ${index}`,
    floor,
    slot,
    status: 'available',
    paid: false
});

const normalizeLayoutResponse = (payload: unknown): { gridSize: number; blueprintTransform: BlueprintTransform | null; buildings: Building[] } => {
    if (!payload || typeof payload !== 'object') {
        return { gridSize: DEFAULT_GRID_SIZE, blueprintTransform: null, buildings: [] };
    }

    const candidate = payload as ApiProjectLayoutResponse;
    const source = candidate.layout ?? candidate;
    const buildings = Array.isArray(source.buildings) ? source.buildings : [];

    return {
        gridSize: normalizeGridSize(source.gridSize),
        blueprintTransform: normalizeBlueprintTransform(source.blueprintTransform),
        buildings: buildings.map((building) => {
            const layoutCols = normalizeLayoutDimension((building as Partial<Building>).layoutCols, DEFAULT_LAYOUT_COLS, MAX_LAYOUT_COLS);
            const layoutRows = normalizeLayoutDimension((building as Partial<Building>).layoutRows, DEFAULT_LAYOUT_ROWS, MAX_LAYOUT_ROWS);
            const unitsPerFloor = getUnitsPerFloor(layoutCols, layoutRows);

            return {
                ...building,
                projectId: building.projectId ?? candidate.projectId ?? appStore.currentProjectId ?? '',
                rotationY: building.rotationY ?? 0,
                layoutCols,
                layoutRows,
                units: Array.isArray(building.units)
                    ? normalizeUnitsFloorSlots(building.units.map((unit) => ({
                        ...unit,
                        buildingId: unit.buildingId ?? building.id
                    })), unitsPerFloor)
                    : []
            };
        })
    };
};

const normalizeDetailedUnitsResponse = (payload: unknown): DetailedUnit[] => {
    if (Array.isArray(payload)) {
        return payload as DetailedUnit[];
    }

    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const candidate = payload as ApiApartmentsResponse;
    const container = candidate as {
        apartments?: ApiApartmentRecord[];
        detailedUnits?: ApiApartmentRecord[];
        data?: ApiApartmentRecord[];
        items?: ApiApartmentRecord[];
        result?: ApiApartmentRecord[];
    };

    const rawUnits = (container.apartments
        ?? container.detailedUnits
        ?? container.data
        ?? container.items
        ?? container.result
        ?? []) as unknown[];

    if (!Array.isArray(rawUnits)) return [];

    return rawUnits.map((raw): DetailedUnit => {
        const row = raw as ApiApartmentRecord;
        const rowRecord = row as Record<string, unknown>;
        const get = (...keys: string[]) => {
            for (const key of keys) {
                if (rowRecord[key] !== undefined) return rowRecord[key];
            }
            return undefined;
        };

        const edificio = String(get('edificio', 'Edificio') ?? '');
        const unidad = String(get('unidad', 'Unidad') ?? '');
        const codUnidad = String(get('codUnidad', 'CodUnidad', 'codigoUnidad', 'CodigoUnidad') ?? '').trim()
            || `${edificio}-${unidad}`.trim();
        const precio = Math.max(0, toNumberOrZero(get('precio', 'Precio')));
        const pagadoRaw = toNumberOrNull(get('pagado', 'Pagado'));
        const pagado = pagadoRaw === null ? null : Math.max(0, pagadoRaw);
        const adeudadoRaw = toNumberOrNull(get('adeudado', 'Adeudado'));

        // Normaliza valores financieros para evitar balances negativos "sin sentido"
        // cuando el backend/envio tiene deuda inconsistente con precio/pagado.
        let adeudado: number | null = adeudadoRaw;
        if (typeof adeudado === 'number') {
            if (Math.abs(adeudado) < 0.01) adeudado = 0;
            if (adeudado < 0) {
                const recalculated = pagado !== null ? Math.max(0, precio - pagado) : 0;
                adeudado = recalculated;
            }
        } else if (pagado !== null) {
            adeudado = Math.max(0, precio - pagado);
        }

        return {
            id: Number(get('id', 'Id') ?? 0),
            codUnidad,
            edificio,
            unidad,
            metraje: toNumberOrZero(get('metraje', 'Metraje')),
            estado: String(get('estado', 'Estado') ?? ''),
            nombre: String(get('nombre', 'Nombre') ?? ''),
            telefono: String(get('telefono', 'Telefono') ?? ''),
            correo: String(get('correo', 'Correo') ?? ''),
            cedula: String(get('cedula', 'Cedula') ?? ''),
            precio,
            inicial: toNumberOrNull(get('inicial', 'Inicial')),
            inicialDolar: toNumberOrNull(get('inicialDolar', 'InicialDolar', 'inicialUSD', 'InicialUSD')),
            pagado,
            adeudado,
            fechaCompletaInicial: (get('fechaCompletaInicial', 'FechaCompletaInicial') ?? null) as string | null,
            fechaInicioVaciados: (get('fechaInicioVaciados', 'FechaInicioVaciados') ?? null) as string | null,
            fechaEntrega: (get('fechaEntrega', 'FechaEntrega') ?? null) as string | null,
            fechaEntregaInspeccion: (get('fechaEntregaInspeccion', 'FechaEntregaInspeccion') ?? null) as string | null,
            fechaLegal: (get('fechaLegal', 'FechaLegal') ?? null) as string | null,
            fechaGobierno: (get('fechaGobierno', 'FechaGobierno') ?? null) as string | null,
            fechaMicelaneos: (get('fechaMicelaneos', 'FechaMicelaneos') ?? null) as string | null,
            fechaInspeccion1: (get('fechaInspeccion1', 'FechaInspeccion1') ?? null) as string | null,
            fechaInspeccion2: (get('fechaInspeccion2', 'FechaInspeccion2') ?? null) as string | null,
            fechaFormaPago: (get('fechaFormaPago', 'FechaFormaPago') ?? null) as string | null,
            iniciadoVaciados: toBooleanOrNull(get('iniciadoVaciados', 'IniciadoVaciados')),
            enInspeccion: toBooleanOrNull(get('enInspeccion', 'EnInspeccion')),
            inspeccion1: toBooleanOrNull(get('inspeccion1', 'Inspeccion1')),
            inspeccion2: toBooleanOrNull(get('inspeccion2', 'Inspeccion2')),
            legal: toBooleanOrNull(get('legal', 'Legal')),
            gobierno: toBooleanOrNull(get('gobierno', 'Gobierno')),
            micelaneos: toBooleanOrNull(get('micelaneos', 'Micelaneos')),
            titulo: toBooleanOrNull(get('titulo', 'Titulo')),
            responsableLegal: String(get('responsableLegal', 'ResponsableLegal') ?? ''),
            responsableGobierno: String(get('responsableGobierno', 'ResponsableGobierno') ?? ''),
            responsableMicelaneos: String(get('responsableMicelaneos', 'ResponsableMicelaneos') ?? ''),
            formaPago: String(get('formaPago', 'FormaPago') ?? ''),
            banco: String(get('banco', 'Banco') ?? '').trim(),
            saldo: toBooleanOrNull(get('saldo', 'Saldo')),
            entregada: toBooleanOrNull(get('entregada', 'Entregada')),
            descargadaDGII: toBooleanOrNull(get('descargadaDGII', 'DescargadaDGII'))
        };
    });
};

const getApartmentCandidates = (building: Building, unit: Unit) => {
    const rawName = unit.name?.trim() || '';
    const buildingName = building.name?.trim() || '';
    const compactBuildingName = buildingName.replace(/^bloque\s+/i, '').replace(/^torre\s+/i, '').trim();

    return new Set([
        unit.codUnidad,
        unit.detailedUnitCode,
        unit.externalUnitCode,
        rawName,
        `${building.projectId}-${rawName}`,
        `${building.id}-${rawName}`,
        `${compactBuildingName}-${rawName}`,
        `${buildingName}-${rawName}`,
        `${building.projectId}-${compactBuildingName}-${rawName}`,
        `${building.projectId}-${compactBuildingName}`,
        rawName.includes(' ') ? rawName.replace(/\s+/g, '-') : rawName
    ].filter((value): value is string => Boolean(value)));
};

const normalizeDetailedUnitStatus = (apartment: DetailedUnit): UnitStatus => {
    const estado = String(apartment.estado ?? '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const formaPago = String(apartment.formaPago ?? '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    if (apartment.entregada === true || estado.includes('entregad')) return 'delivered';
    if (apartment.enInspeccion === true || estado.includes('inspeccion')) return 'inspection';
    if (formaPago.includes('financi') || estado.includes('financ')) return 'financing';
    if (estado.includes('vend')) return 'sold';
    if (estado.includes('reserv')) return 'reserved';
    if (estado.includes('observ')) return 'observation';
    if (estado.includes('manten')) return 'maintenance';
    return 'available';
};

const applyDetailedUnitToLayoutUnit = (unit: Unit, apartment: DetailedUnit) => {
    unit.codUnidad = apartment.codUnidad || unit.codUnidad;
    unit.detailedUnitCode = apartment.codUnidad || unit.detailedUnitCode;
    unit.externalUnitCode = apartment.codUnidad || unit.externalUnitCode;
    unit.estado = apartment.estado || unit.estado;
    unit.status = normalizeDetailedUnitStatus(apartment);
    unit.bank = apartment.banco?.trim() || undefined;
    unit.enInspeccion = apartment.enInspeccion ?? undefined;
    unit.legal = apartment.legal ?? undefined;
    unit.titulo = apartment.titulo ?? undefined;
    unit.descargadaDGII = apartment.descargadaDGII ?? undefined;
    unit.saldo = apartment.saldo ?? undefined;
    unit.balance = apartment.adeudado ?? unit.balance;
    unit.price = apartment.precio ?? unit.price;
    unit.hasDebt = typeof apartment.adeudado === 'number' ? apartment.adeudado > 0 : undefined;
    unit.paid = typeof apartment.adeudado === 'number'
        ? apartment.adeudado <= 0
        : (apartment.saldo ?? unit.paid);
    unit.deliveryDate = apartment.fechaEntregaInspeccion ?? unit.deliveryDate;
};

const linkProjectApartmentsToLayout = (projectId: string) => {
    const projectBuildings = appStore.buildings.filter(building => building.projectId === projectId);
    const apartments = appStore.detailedUnits;

    const apartmentByCod = new Map<string, DetailedUnit>();
    const apartmentByBuildingUnit = new Map<string, DetailedUnit>();

    apartments.forEach((apartment) => {
        const codKey = normalizeLookupKey(apartment.codUnidad);
        if (codKey) apartmentByCod.set(codKey, apartment);

        const byBuildingUnit = normalizeLookupKey(`${apartment.edificio}-${apartment.unidad}`);
        if (byBuildingUnit) apartmentByBuildingUnit.set(byBuildingUnit, apartment);
    });

    projectBuildings.forEach(building => {
        building.units.forEach(unit => {
            const candidates = getApartmentCandidates(building, unit);
            const normalizedCandidates = Array.from(candidates)
                .map(candidate => normalizeLookupKey(candidate))
                .filter(Boolean);

            let matchedApartment: DetailedUnit | undefined;
            for (const key of normalizedCandidates) {
                matchedApartment = apartmentByCod.get(key) ?? apartmentByBuildingUnit.get(key);
                if (matchedApartment) break;
            }

            unit.detailedUnitId = matchedApartment ? matchedApartment.id : null;
            if (matchedApartment) {
                applyDetailedUnitToLayoutUnit(unit, matchedApartment);
            }
        });
    });
};

type ExcelApartmentRow = {
    codUnidad: string;
    edificio: string;
    unidad: string;
    estado: string;
    floor: number;
    status: UnitStatus;
    paid: boolean;
    price?: number;
    balance?: number;
    hasDebt?: boolean;
    bank?: string;
    enInspeccion?: boolean;
    legal?: boolean;
    titulo?: boolean;
    descargadaDGII?: boolean;
    saldo?: boolean;
};

const normalizeHeader = (value: unknown) => String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const getHeaderIndex = (headers: unknown[], aliases: string[]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
};

const getHeaderIndexes = (headers: unknown[], aliases: string[]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    return headers
        .map((header, index) => ({ header: normalizeHeader(header), index }))
        .filter(({ header }) => normalizedAliases.includes(header))
        .map(({ index }) => index);
};

const toOptionalNumber = (value: unknown): number | undefined => {
    const parsed = toNumberOrNull(value);
    return parsed === null ? undefined : parsed;
};

const toBooleanFromExcel = (value: unknown): boolean | undefined => {
    const parsed = toBooleanOrNull(value);
    return parsed === null ? undefined : parsed;
};

const toUnitStatus = (rawStatus: string, financed: boolean, delivered: boolean, inspection: boolean): UnitStatus => {
    const normalized = rawStatus
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    if (delivered) return 'delivered';
    if (inspection) return 'inspection';
    if (financed) return 'financing';
    if (normalized.includes('vend')) return 'sold';
    if (normalized.includes('reserv')) return 'reserved';
    if (normalized.includes('observ')) return 'observation';
    if (normalized.includes('manten')) return 'maintenance';
    if (normalized.includes('disponible')) return 'available';
    return 'available';
};

const inferFloorFromUnit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 1;

    const direct = Number(trimmed);
    if (Number.isFinite(direct) && direct >= 100) {
        return Math.max(1, Math.floor(direct / 100));
    }

    const lastNumericToken = trimmed.match(/(\d{3,4})(?!.*\d)/);
    if (lastNumericToken) {
        const parsed = Number(lastNumericToken[1]);
        if (Number.isFinite(parsed) && parsed >= 100) {
            return Math.max(1, Math.floor(parsed / 100));
        }
    }

    return 1;
};

const inferLayoutDimensions = (unitsPerFloor: number) => {
    const safeUnitsPerFloor = Math.min(MAX_LAYOUT_COLS * MAX_LAYOUT_ROWS, Math.max(1, unitsPerFloor));
    const cols = Math.min(MAX_LAYOUT_COLS, Math.max(1, Math.ceil(Math.sqrt(safeUnitsPerFloor))));
    const rows = Math.min(MAX_LAYOUT_ROWS, Math.max(1, Math.ceil(safeUnitsPerFloor / cols)));
    return { cols, rows };
};

const parseExcelSheetRows = (rows: unknown[][]): ExcelApartmentRow[] => {
    if (rows.length < 2) return [];

    const headers = rows[0] ?? [];
    const codIdx = getHeaderIndex(headers, ['cod. unidad', 'cod unidad', 'codigo unidad', 'unidad ii', 'unidad']);
    const edificioIdx = getHeaderIndex(headers, ['edificio', 'bloque', 'torre']);
    const unidadCandidates = getHeaderIndexes(headers, ['unidad', 'apartamento', 'apto', 'numero unidad', 'no unidad']);
    const unidadIdx = (() => {
        if (unidadCandidates.length === 0) return -1;
        const prioritized = unidadCandidates.filter((index) => index !== codIdx);
        const candidates = prioritized.length > 0 ? prioritized : unidadCandidates;
        if (candidates.length === 1) return candidates[0];

        let bestIndex = candidates[0];
        let bestScore = -1;
        candidates.forEach((candidateIndex) => {
            let numericLikeCount = 0;
            let inspected = 0;
            for (let rowIndex = 1; rowIndex < Math.min(rows.length, 30); rowIndex++) {
                const cell = rows[rowIndex]?.[candidateIndex];
                if (cell == null || cell === '') continue;
                inspected += 1;
                const normalized = String(cell).trim();
                if (/^\d+$/.test(normalized)) numericLikeCount += 1;
            }
            const score = inspected === 0 ? 0 : numericLikeCount / inspected;
            const preferredByPosition = edificioIdx >= 0 && candidateIndex > edificioIdx ? 0.1 : 0;
            const totalScore = score + preferredByPosition;
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestIndex = candidateIndex;
            }
        });
        return bestIndex;
    })();
    const estadoIdx = getHeaderIndex(headers, ['estado']);
    const precioIdx = getHeaderIndex(headers, ['precio']);
    const adeudadoIdx = getHeaderIndex(headers, ['adeudado', 'balance']);
    const pagadoIdx = getHeaderIndex(headers, ['pagado']);
    const bancoIdx = getHeaderIndex(headers, ['banco']);
    const inspeccionIdx = getHeaderIndex(headers, ['en inspeccion']);
    const legalIdx = getHeaderIndex(headers, ['legal']);
    const tituloIdx = getHeaderIndex(headers, ['titulo']);
    const dgiiIdx = getHeaderIndex(headers, ['descargada dgii']);
    const saldoIdx = getHeaderIndex(headers, ['saldo']);
    const entregadaIdx = getHeaderIndex(headers, ['entregada']);
    const formaPagoIdx = getHeaderIndex(headers, ['forma de pago']);

    if (edificioIdx < 0 || unidadIdx < 0) return [];

    const parsed: ExcelApartmentRow[] = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i] ?? [];
        const edificio = String(row[edificioIdx] ?? '').trim();
        const unidad = String(row[unidadIdx] ?? '').trim();
        if (!edificio || !unidad) continue;

        const codFromRow = codIdx >= 0 ? String(row[codIdx] ?? '').trim() : '';
        const codUnidad = codFromRow || `${edificio}-${unidad}`;
        const enInspeccion = inspeccionIdx >= 0 ? toBooleanFromExcel(row[inspeccionIdx]) : undefined;
        const entregada = entregadaIdx >= 0 ? toBooleanFromExcel(row[entregadaIdx]) : undefined;
        const formaPago = formaPagoIdx >= 0 ? String(row[formaPagoIdx] ?? '').toLowerCase() : '';
        const financed = formaPago.includes('financi');
        const status = toUnitStatus(
            estadoIdx >= 0 ? String(row[estadoIdx] ?? '') : '',
            financed,
            Boolean(entregada),
            Boolean(enInspeccion)
        );
        const price = precioIdx >= 0 ? toOptionalNumber(row[precioIdx]) : undefined;
        const balance = adeudadoIdx >= 0 ? toOptionalNumber(row[adeudadoIdx]) : undefined;
        const paidAmount = pagadoIdx >= 0 ? toOptionalNumber(row[pagadoIdx]) : undefined;
        const paid = balance !== undefined ? balance <= 0 : (paidAmount ?? 0) > 0;

        parsed.push({
            codUnidad,
            edificio,
            unidad,
            estado: estadoIdx >= 0 ? String(row[estadoIdx] ?? '').trim() : '',
            floor: inferFloorFromUnit(unidad),
            status,
            paid,
            price,
            balance,
            hasDebt: typeof balance === 'number' ? balance > 0 : undefined,
            bank: bancoIdx >= 0 ? String(row[bancoIdx] ?? '').trim() || undefined : undefined,
            enInspeccion,
            legal: legalIdx >= 0 ? toBooleanFromExcel(row[legalIdx]) : undefined,
            titulo: tituloIdx >= 0 ? toBooleanFromExcel(row[tituloIdx]) : undefined,
            descargadaDGII: dgiiIdx >= 0 ? toBooleanFromExcel(row[dgiiIdx]) : undefined,
            saldo: saldoIdx >= 0 ? toBooleanFromExcel(row[saldoIdx]) : undefined
        });
    }

    return parsed;
};

const buildLayoutFromExcelRows = (projectId: string, rows: ExcelApartmentRow[], detailedUnits: DetailedUnit[]) => {
    const rowsByBuilding = new Map<string, ExcelApartmentRow[]>();
    rows.forEach((row) => {
        const key = row.edificio.trim();
        const list = rowsByBuilding.get(key) ?? [];
        list.push(row);
        rowsByBuilding.set(key, list);
    });

    const detailedByCode = new Map(detailedUnits.map((apartment) => [apartment.codUnidad.trim().toLowerCase(), apartment.id]));
    const detailedByBuildingUnit = new Map(
        detailedUnits.map((apartment) => [`${apartment.edificio}-${apartment.unidad}`.trim().toLowerCase(), apartment.id])
    );

    const buildingEntries = Array.from(rowsByBuilding.entries()).sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true }));
    const perRow = Math.max(1, Math.ceil(Math.sqrt(buildingEntries.length)));
    const spacing = 8;

    const buildings: Building[] = buildingEntries.map(([buildingName, buildingRows], index) => {
        const buildingId = `bld_${generateId()}`;
        const sortedRows = [...buildingRows].sort((a, b) => {
            if (a.floor !== b.floor) return a.floor - b.floor;
            return a.unidad.localeCompare(b.unidad, 'es', { numeric: true });
        });

        const unitsByFloor = new Map<number, ExcelApartmentRow[]>();
        sortedRows.forEach((row) => {
            const floorRows = unitsByFloor.get(row.floor) ?? [];
            floorRows.push(row);
            unitsByFloor.set(row.floor, floorRows);
        });

        const maxUnitsPerFloor = Math.max(1, ...Array.from(unitsByFloor.values()).map((floorRows) => floorRows.length));
        const { cols, rows: layoutRows } = inferLayoutDimensions(maxUnitsPerFloor);

        const units: Unit[] = [];
        const floorOrder = Array.from(unitsByFloor.keys()).sort((a, b) => a - b);
        floorOrder.forEach((floor) => {
            const floorRows = unitsByFloor.get(floor) ?? [];
            floorRows.forEach((row, slotIndex) => {
                const byCode = detailedByCode.get(row.codUnidad.trim().toLowerCase()) ?? null;
                const byBuildingUnit = detailedByBuildingUnit.get(`${row.edificio}-${row.unidad}`.trim().toLowerCase()) ?? null;
                const detailedUnitId = byCode ?? byBuildingUnit ?? null;
                units.push({
                    id: `unt_${generateId()}`,
                    detailedUnitId,
                    buildingId,
                    name: row.unidad,
                    floor,
                    slot: slotIndex,
                    codUnidad: row.codUnidad,
                    detailedUnitCode: row.codUnidad,
                    externalUnitCode: row.codUnidad,
                    estado: row.estado,
                    status: row.status,
                    paid: row.paid,
                    price: row.price,
                    balance: row.balance,
                    hasDebt: row.hasDebt,
                    bank: row.bank,
                    enInspeccion: row.enInspeccion,
                    legal: row.legal,
                    titulo: row.titulo,
                    descargadaDGII: row.descargadaDGII,
                    saldo: row.saldo
                });
            });
        });

        const rowIndex = Math.floor(index / perRow);
        const colIndex = index % perRow;

        return {
            id: buildingId,
            projectId,
            name: buildingName,
            position: {
                x: (colIndex - ((perRow - 1) / 2)) * spacing,
                z: (rowIndex - ((Math.ceil(buildingEntries.length / perRow) - 1) / 2)) * spacing
            },
            dimensions: {
                width: 3.5,
                depth: 3.5,
                height: Math.max(8, floorOrder.length * 2.8)
            },
            rotationY: 0,
            layoutCols: cols,
            layoutRows,
            units
        };
    });

    return buildings;
};

const apartmentToLayoutRow = (apartment: DetailedUnit): ExcelApartmentRow => {
    const balance = apartment.adeudado ?? undefined;
    return {
        codUnidad: apartment.codUnidad || `${apartment.edificio}-${apartment.unidad}`.trim(),
        edificio: apartment.edificio || 'N/A',
        unidad: apartment.unidad || apartment.codUnidad || String(apartment.id),
        estado: apartment.estado || '',
        floor: inferFloorFromUnit(apartment.unidad || apartment.codUnidad),
        status: normalizeDetailedUnitStatus(apartment),
        paid: typeof apartment.adeudado === 'number'
            ? apartment.adeudado <= 0
            : Boolean(apartment.saldo),
        price: apartment.precio,
        balance,
        hasDebt: typeof balance === 'number' ? balance > 0 : undefined,
        bank: apartment.banco?.trim() || undefined,
        enInspeccion: apartment.enInspeccion ?? undefined,
        legal: apartment.legal ?? undefined,
        titulo: apartment.titulo ?? undefined,
        descargadaDGII: apartment.descargadaDGII ?? undefined,
        saldo: apartment.saldo ?? undefined
    };
};

const buildLayoutRowsFromApartments = (apartments: DetailedUnit[]) => apartments
    .filter((apartment) => apartment.edificio || apartment.unidad || apartment.codUnidad)
    .map(apartmentToLayoutRow);

const getApartmentsForLayoutGeneration = async (projectId: string) => {
    const cachedApartments = appStore.detailedUnitsByProject[projectId] ?? appStore.detailedUnits;
    if (cachedApartments.length > 0) {
        appStore.detailedUnitsByProject[projectId] = cachedApartments;
        syncCurrentProjectApartments(projectId);
        return cachedApartments;
    }

    const loadedApartments = await loadProjectApartments(projectId);
    syncCurrentProjectApartments(projectId);
    return loadedApartments;
};

interface AppState {
    appMode: 'edit' | 'view';
    dragBuildingsEnabled: boolean;
    currentProjectId: string | null;
    buildings: Building[];
    users: User[];
    projects: Project[];
    detailedUnits: DetailedUnit[];
    unitColorSettings: UnitColorSetting[];
    detailedUnitsByProject: Record<string, DetailedUnit[]>;
    apartmentStatsByProject: Record<string, ApiApartmentStatsResponse>;
    availableProjectIds: string[];
    currentUser: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    selectedBuildingId: string | null;
    selectedUnitId: string | null;
    gridSize: number;
    blueprintTransform: BlueprintTransform | null;
    currentProjectLayoutStatus: 'idle' | 'loading' | 'saving' | 'ready' | 'missing' | 'error';
    currentProjectLayoutMessage: string;
    isProjectsLoading: boolean;
    isApartmentsLoading: boolean;
    isUnitColorsLoading: boolean;
    isUnitColorsSaving: boolean;
    isApartmentsLoadingByProject: Record<string, boolean>;
    projectsErrorMessage: string;
    unitColorsErrorMessage: string;
    apartmentsErrorByProject: Record<string, string>;
    networkBusyCount: number;
    isAuthInitializing: boolean;
    isProjectContextLoading: boolean;
    visualFilters: {
        detailedUnitIds: number[] | null;
        status: UnitStatus | null;
        bank: string | null;
        hasDebt: boolean | null;
        enInspeccion: boolean | null;
        legal: boolean | null;
        titulo: boolean | null;
        descargadaDGII: boolean | null;
        saldo: boolean | null;
    };
    dashboardFilterPopupState: DashboardFilterPopupState | null;
    dashboardFilterStateByProject: Record<string, DashboardFilterRouteState>;
    cameraStateByProject: Record<string, CameraViewState>;
}

export const appStore = reactive<AppState>({
    appMode: 'view',
    dragBuildingsEnabled: false,
    currentProjectId: null,
    buildings: [],
    users: [],
    projects: [],
    availableProjectIds: [],
    detailedUnits: [],
    unitColorSettings: defaultUnitColorSettings(),
    detailedUnitsByProject: {},
    apartmentStatsByProject: {},
    currentUser: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    selectedBuildingId: null,
    selectedUnitId: null,
    gridSize: DEFAULT_GRID_SIZE,
    blueprintTransform: null,
    currentProjectLayoutStatus: 'idle',
    currentProjectLayoutMessage: '',
    isProjectsLoading: false,
    isApartmentsLoading: false,
    isUnitColorsLoading: false,
    isUnitColorsSaving: false,
    isApartmentsLoadingByProject: {},
    projectsErrorMessage: '',
    unitColorsErrorMessage: '',
    apartmentsErrorByProject: {},
    networkBusyCount: 0,
    isAuthInitializing: false,
    isProjectContextLoading: false,
    visualFilters: {
        detailedUnitIds: null,
        status: null,
        bank: null,
        hasDebt: null,
        enInspeccion: null,
        legal: null,
        titulo: null,
        descargadaDGII: null,
        saldo: null
    },
    dashboardFilterPopupState: null,
    dashboardFilterStateByProject: {},
    cameraStateByProject: {}
});

export const selectProject = (id: string | null) => {
    const isSameProject = appStore.currentProjectId === id;

    appStore.currentProjectId = id;
    appStore.selectedBuildingId = null;
    appStore.selectedUnitId = null;
    if (!isSameProject) {
        appStore.visualFilters = {
            detailedUnitIds: null,
            status: null,
            bank: null,
            hasDebt: null,
            enInspeccion: null,
            legal: null,
            titulo: null,
            descargadaDGII: null,
            saldo: null
        };
        appStore.dashboardFilterPopupState = null;
    }

    if (id) {
        syncCurrentProjectApartments(id);

        const hasDetailedProject = detailedProjectIds.has(id);
        if (isSameProject && appStore.isProjectContextLoading) {
            return;
        }
        if (isSameProject && hasDetailedProject && appStore.currentProjectLayoutStatus !== 'idle') {
            return;
        }

        appStore.gridSize = DEFAULT_GRID_SIZE;
        appStore.blueprintTransform = null;
        clearProjectLayoutState(id);
        appStore.currentProjectLayoutStatus = 'loading';
        appStore.currentProjectLayoutMessage = '';
        appStore.isProjectContextLoading = true;
        void Promise.allSettled([
            loadProject(id),
            loadProjectLayout(id),
            loadProjectApartments(id),
            loadProjectApartmentStats(id)
        ]).finally(() => {
            if (appStore.currentProjectId === id) {
                appStore.isProjectContextLoading = false;
            }
        });
    } else {
        clearProjectApartmentState();
        appStore.currentProjectLayoutStatus = 'idle';
        appStore.currentProjectLayoutMessage = '';
        appStore.isProjectContextLoading = false;
    }
};

export const reloadProjectInfo = async (id = appStore.currentProjectId) => {
    if (!id) return;

    appStore.currentProjectId = id;
    syncCurrentProjectApartments(id);
    appStore.currentProjectLayoutStatus = 'loading';
    appStore.currentProjectLayoutMessage = '';
    appStore.isProjectContextLoading = true;

    try {
        await Promise.allSettled([
            loadProject(id),
            loadProjectLayout(id),
            loadProjectApartments(id),
            loadProjectApartmentStats(id)
        ]);
    } finally {
        if (appStore.currentProjectId === id) {
            appStore.isProjectContextLoading = false;
        }
    }
};

export const getProjectApartmentStats = (projectId: string) => appStore.apartmentStatsByProject[projectId] ?? null;

export const setAppMode = (mode: 'edit' | 'view') => {
    appStore.appMode = mode;
    appStore.selectedBuildingId = null;
    appStore.selectedUnitId = null;
};

export const setDragBuildingsEnabled = (enabled: boolean) => {
    appStore.dragBuildingsEnabled = enabled;
};

// Simple unique ID generator
export const generateId = () => Math.random().toString(36).substring(2, 9);

export const addBuilding = (position: { x: number, z: number }) => {
    if (!appStore.currentProjectId) {
        console.warn('Cannot add building without a selected project');
        return null;
    }
    const buildingId = `bld_${generateId()}`;
    const newBuilding: Building = {
        id: buildingId,
        projectId: appStore.currentProjectId,
        name: `Edificio ${appStore.buildings.length + 1}`,
        position,
        dimensions: { width: 4, depth: 4, height: 8 },
        rotationY: 0,
        layoutCols: DEFAULT_LAYOUT_COLS,
        layoutRows: DEFAULT_LAYOUT_ROWS,
        units: []
    };
    
    // Add default unit
    const defaultUnit: Unit = {
        id: `unt_${generateId()}`,
        detailedUnitId: null,
        buildingId: buildingId,
        name: `Unidad 1`,
        floor: 1,
        slot: 0,
        status: 'available',
        paid: false
    };

    newBuilding.units.push(defaultUnit);

    appStore.buildings.push(newBuilding);
    return newBuilding;
};

export const setGridSize = (size: number) => {
    appStore.gridSize = size;
};

export const setBlueprintTransform = (transform: BlueprintTransform | Partial<BlueprintTransform> | null) => {
    if (transform === null) {
        appStore.blueprintTransform = null;
        return;
    }

    const base = appStore.blueprintTransform ?? {
        x: 0,
        z: 0,
        width: Math.max(1, appStore.gridSize * 0.8),
        depth: Math.max(1, appStore.gridSize * 0.8),
        rotationY: 0,
        opacity: 1
    };

    const nextTransform = normalizeBlueprintTransform({ ...base, ...transform });
    appStore.blueprintTransform = nextTransform;
};

export const setVisualFilters = (filters: Partial<AppState['visualFilters']>) => {
    appStore.visualFilters = { ...appStore.visualFilters, ...filters };
};

export const setDashboardFilterPopupState = (state: DashboardFilterPopupState | null) => {
    appStore.dashboardFilterPopupState = state;
    if (!appStore.currentProjectId) return;

    if (!state) {
        delete appStore.dashboardFilterStateByProject[appStore.currentProjectId];
        return;
    }

    appStore.dashboardFilterStateByProject[appStore.currentProjectId] = {
        detailedUnitIds: appStore.visualFilters.detailedUnitIds,
        popupState: state
    };
};

export const addUnitToBuilding = (buildingId: string) => {
    const bld = appStore.buildings.find(b => b.id === buildingId);
    if (!bld) return null;
    const unitsPerFloor = getUnitsPerFloor(
        normalizeLayoutDimension(bld.layoutCols, DEFAULT_LAYOUT_COLS, MAX_LAYOUT_COLS),
        normalizeLayoutDimension(bld.layoutRows, DEFAULT_LAYOUT_ROWS, MAX_LAYOUT_ROWS)
    );
    const nextPlacement = getNextUnitFloorAndSlot(bld.units, unitsPerFloor);

    const newUnit: Unit = {
        id: `unt_${generateId()}`,
        detailedUnitId: null,
        buildingId: bld.id,
        name: `Apto ${bld.units.length + 1}`,
        floor: nextPlacement.floor,
        slot: nextPlacement.slot,
        status: 'available',
        paid: false
    };

    bld.units.push(newUnit);
    return newUnit;
};

export const updateBuildingUnitLayout = (buildingId: string, layoutCols: number, layoutRows: number) => {
    const bld = appStore.buildings.find(b => b.id === buildingId);
    if (!bld) return;

    const previousUnitsPerFloor = getUnitsPerFloor(
        normalizeLayoutDimension(bld.layoutCols, DEFAULT_LAYOUT_COLS, MAX_LAYOUT_COLS),
        normalizeLayoutDimension(bld.layoutRows, DEFAULT_LAYOUT_ROWS, MAX_LAYOUT_ROWS)
    );
    const normalizedCurrentUnits = normalizeUnitsFloorSlots(
        bld.units.map((unit) => ({ ...unit })),
        previousUnitsPerFloor
    );

    const normalizedCols = normalizeLayoutDimension(layoutCols, DEFAULT_LAYOUT_COLS, MAX_LAYOUT_COLS);
    const normalizedRows = normalizeLayoutDimension(layoutRows, DEFAULT_LAYOUT_ROWS, MAX_LAYOUT_ROWS);
    const unitsPerFloor = getUnitsPerFloor(normalizedCols, normalizedRows);

    bld.layoutCols = normalizedCols;
    bld.layoutRows = normalizedRows;

    // If the layout grows (e.g. 1x1 -> 2x2), auto-complete all slots for each current floor.
    if (unitsPerFloor > previousUnitsPerFloor) {
        const targetFloors = Math.max(1, ...normalizedCurrentUnits.map(unit => unit.floor || 1));
        const units = [...normalizedCurrentUnits];
        const occupied = new Set(units.map(unit => `${unit.floor}:${unit.slot}`));
        let createdCount = 0;

        for (let floor = 1; floor <= targetFloors; floor++) {
            for (let slot = 0; slot < unitsPerFloor; slot++) {
                const key = `${floor}:${slot}`;
                if (occupied.has(key)) continue;
                createdCount += 1;
                const createdUnit = createAutoUnit(buildingId, normalizedCurrentUnits.length + createdCount, floor, slot);
                units.push(createdUnit);
                occupied.add(key);
            }
        }

        bld.units = units
            .sort((a, b) => (a.floor - b.floor) || (a.slot - b.slot))
            .map(unit => ({ ...unit }));
        return;
    }

    bld.units = normalizeUnitsFloorSlots(normalizedCurrentUnits, unitsPerFloor);
};

export const updateUnit = (buildingId: string, unitId: string, updates: Partial<Unit>) => {
    const bld = appStore.buildings.find(b => b.id === buildingId);
    if (!bld) return;
    
    const unitIndex = bld.units.findIndex(u => u.id === unitId);
    if (unitIndex > -1) {
        bld.units[unitIndex] = { ...bld.units[unitIndex], ...updates };
    }
};

export const selectBuilding = (id: string | null) => {
    appStore.selectedBuildingId = id;
    if (id) {
        appStore.selectedUnitId = null; // Deselect unit when selecting building
    }
};

export const selectUnit = (id: string | null) => {
    appStore.selectedUnitId = id;
    if (id) {
        // Also select the parent building
        const parentBld = appStore.buildings.find(b => b.units.some(u => u.id === id));
        if (parentBld) {
            appStore.selectedBuildingId = parentBld.id;
        }
    }
};

export const deleteBuilding = (id: string) => {
    const index = appStore.buildings.findIndex(b => b.id === id);
    if (index > -1) {
        appStore.buildings.splice(index, 1);
        if (appStore.selectedBuildingId === id) {
            appStore.selectedBuildingId = null;
            appStore.selectedUnitId = null;
        }
    }
};

export const deleteUnit = (buildingId: string, unitId: string) => {
    const bld = appStore.buildings.find(b => b.id === buildingId);
    if (!bld) return;

    const unitIndex = bld.units.findIndex(u => u.id === unitId);
    if (unitIndex > -1) {
        bld.units.splice(unitIndex, 1);
        if (appStore.selectedUnitId === unitId) {
            appStore.selectedUnitId = null;
        }
    }
};

export const updateBuilding = (id: string, updates: Partial<Building>) => {
    const bld = appStore.buildings.find(b => b.id === id);
    if (bld) {
        Object.assign(bld, updates);
    }
};

export const updateCurrentProjectBuildingDimensions = (dimensions: Building['dimensions']) => {
    if (!appStore.currentProjectId) return 0;

    let updatedCount = 0;
    appStore.buildings.forEach((building) => {
        if (building.projectId !== appStore.currentProjectId) return;
        building.dimensions = { ...dimensions };
        updatedCount += 1;
    });

    return updatedCount;
};

export const updateBuildingPosition = (id: string, position: { x: number, z: number }) => {
    const bld = appStore.buildings.find(b => b.id === id);
    if (bld) {
        bld.position = position;
    }
};

// User Management Actions
export const addUser = async (userData: Omit<User, 'id'>) => {
    const payload = { ...userData };

    try {
        const response = await fetch(`${API_BASE_URL}/Users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            let responsePayload: unknown = null;
            try {
                responsePayload = await response.json();
            } catch (_parseError) {
                responsePayload = null;
            }

            const createdUser = normalizeUserResponse(responsePayload);
            if (createdUser) {
                appStore.users.push(createdUser);
                return createdUser;
            }

            await loadUsers();
            return appStore.users.find(user => user.email === userData.email) ?? null;
        }
    } catch (_error) {
        // Fall back to a local optimistic insert below.
    }

    return null;
};

export const updateUser = async (id: number, updates: Partial<User> & { oldPassword?: string }): Promise<User | null> => {
    const user = appStore.users.find(u => u.id === id);
    const normalizedPassword = typeof updates.password === 'string' ? updates.password.trim() : '';
    const requestPayload = {
        ...(user ?? { id }),
        ...updates,
        ...(normalizedPassword ? { password: normalizedPassword, newPassword: normalizedPassword } : {}),
        id
    };
    const nextUser = user ? { ...user, ...updates, ...(normalizedPassword ? { password: normalizedPassword } : {}), id } : null;

    try {
        const response = await fetch(`${API_BASE_URL}/Users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(requestPayload)
        });

        if (response.ok) {
            let responsePayload: unknown = null;
            try {
                responsePayload = await response.json();
            } catch (_parseError) {
                responsePayload = null;
            }

            const updatedUser = normalizeUserResponse(responsePayload) ?? nextUser;
            if (updatedUser) {
                const index = appStore.users.findIndex(u => u.id === id);
                if (index > -1) {
                    appStore.users[index] = updatedUser;
                } else {
                    appStore.users.push(updatedUser);
                }
            }
            return updatedUser;
        }
    } catch (_error) {
        // Fall back to local optimistic update below.
    }

    return null;
};

export const updateProfile = async (updates: Partial<User> & { oldPassword?: string }): Promise<User | null> => {
    if (!appStore.currentUser) return null;

    const requestPayload = {
        id: appStore.currentUser.id,
        ...updates
    };

    const trySaveProfile = async (method: 'PUT' | 'PATCH') => {
        const response = await fetch(`${API_BASE_URL}/Profile/me`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(requestPayload)
        });

        return response;
    };

    try {
        let response = await trySaveProfile('PUT');
        if (response.status === 404 || response.status === 405) {
            response = await trySaveProfile('PATCH');
        }

        if (!response.ok) {
            let errorMessage = 'No se pudo actualizar el perfil.';
            try {
                const errorPayload = await response.json() as { message?: string };
                if (typeof errorPayload?.message === 'string' && errorPayload.message.trim() !== '') {
                    errorMessage = errorPayload.message;
                }
            } catch (_parseError) {
                // Keep default message if error payload is not JSON.
            }
            throw new Error(errorMessage);
        }

        let responsePayload: unknown = null;
        try {
            responsePayload = await response.json();
        } catch (_parseError) {
            responsePayload = null;
        }

        const updatedUser = normalizeUserResponse(responsePayload) ?? {
            ...appStore.currentUser,
            ...updates
        };

        appStore.currentUser = updatedUser;
        const index = appStore.users.findIndex(user => user.id === updatedUser.id);
        if (index > -1) {
            appStore.users[index] = updatedUser;
        }

        persistAuthSession({
            user: updatedUser,
            accessToken: appStore.accessToken,
            refreshToken: appStore.refreshToken
        });

        return updatedUser;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('No se pudo actualizar el perfil.');
    }
};

export const deleteUser = async (id: number) => {
    try {
        const response = await fetch(`${API_BASE_URL}/Users/${id}`, {
            method: 'DELETE',
            headers: {
                ...getAuthHeaders()
            }
        });

        if (response.ok) {
            const index = appStore.users.findIndex(u => u.id === id);
            if (index > -1) {
                appStore.users.splice(index, 1);
            }
            return;
        }
    } catch (_error) {
        // Fall back to local removal below.
    }

    const index = appStore.users.findIndex(u => u.id === id);
    if (index > -1) {
        appStore.users.splice(index, 1);
    }
};

export const loadUnitColorSettings = async () => {
    appStore.isUnitColorsLoading = true;
    appStore.unitColorsErrorMessage = '';
    beginNetworkActivity();

    try {
        const response = await fetchWithTimeout(UNIT_COLORS_ENDPOINT, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (handleUnauthorizedResponse(response)) {
            return appStore.unitColorSettings;
        }

        if (!response.ok) {
            throw new Error('No se pudieron cargar los colores de unidades.');
        }

        const payload = await response.json();
        const settings = normalizeUnitColorSettingsResponse(payload);
        syncUnitColorSettingsState(settings.length > 0 ? settings : defaultUnitColorSettings());
        return appStore.unitColorSettings;
    } catch (error) {
        appStore.unitColorsErrorMessage = error instanceof Error
            ? error.message
            : 'No se pudieron cargar los colores de unidades.';
        syncUnitColorSettingsState(appStore.unitColorSettings.length > 0 ? appStore.unitColorSettings : defaultUnitColorSettings());
        return appStore.unitColorSettings;
    } finally {
        appStore.isUnitColorsLoading = false;
        endNetworkActivity();
    }
};

export const saveUnitColorSetting = async (setting: Omit<UnitColorSetting, 'id'> & { id?: UnitColorSetting['id'] }) => {
    const estado = setting.estado.trim();
    const colorCss = normalizeHexColor(setting.colorCss);
    const id = setting.id ?? null;

    if (!estado) {
        throw new Error('El nombre del estado es requerido.');
    }

    appStore.isUnitColorsSaving = true;
    appStore.unitColorsErrorMessage = '';
    beginNetworkActivity();

    try {
        const response = await fetch(id === null ? UNIT_COLORS_ENDPOINT : `${UNIT_COLORS_ENDPOINT}/${encodeURIComponent(String(id))}`, {
            method: id === null ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                id,
                estado,
                name: estado,
                label: estado,
                color: colorCss,
                colorCss
            })
        });

        if (handleUnauthorizedResponse(response)) {
            return null;
        }

        if (!response.ok) {
            throw new Error('No se pudo guardar el color del estado.');
        }

        let responsePayload: unknown = null;
        try {
            responsePayload = await response.json();
        } catch (_parseError) {
            responsePayload = null;
        }

        const savedSetting = normalizeUnitColorSetting(responsePayload)
            ?? normalizeUnitColorSettingsResponse(responsePayload)[0]
            ?? { id: id ?? normalizeEstadoKey(estado), estado, colorCss };
        const savedKey = normalizeEstadoKey(savedSetting.estado);
        const nextSettings = [...appStore.unitColorSettings];
        const existingIndex = nextSettings.findIndex((item) =>
            (savedSetting.id !== null && item.id === savedSetting.id)
            || normalizeEstadoKey(item.estado) === savedKey
        );

        if (existingIndex >= 0) {
            nextSettings[existingIndex] = savedSetting;
        } else {
            nextSettings.push(savedSetting);
        }

        syncUnitColorSettingsState(nextSettings);
        return savedSetting;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo guardar el color del estado.';
        appStore.unitColorsErrorMessage = message;
        throw new Error(message);
    } finally {
        appStore.isUnitColorsSaving = false;
        endNetworkActivity();
    }
};

export const deleteUnitColorSetting = async (setting: UnitColorSetting) => {
    const identifier = setting.id ?? normalizeEstadoKey(setting.estado);

    appStore.isUnitColorsSaving = true;
    appStore.unitColorsErrorMessage = '';
    beginNetworkActivity();

    try {
        const response = await fetch(`${UNIT_COLORS_ENDPOINT}/${encodeURIComponent(String(identifier))}`, {
            method: 'DELETE',
            headers: {
                ...getAuthHeaders()
            }
        });

        if (handleUnauthorizedResponse(response)) {
            return false;
        }

        if (!response.ok) {
            throw new Error('No se pudo eliminar el color del estado.');
        }

        const deletedKey = normalizeEstadoKey(setting.estado);
        syncUnitColorSettingsState(
            appStore.unitColorSettings.filter((item) =>
                item.id !== setting.id && normalizeEstadoKey(item.estado) !== deletedKey
            )
        );
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo eliminar el color del estado.';
        appStore.unitColorsErrorMessage = message;
        throw new Error(message);
    } finally {
        appStore.isUnitColorsSaving = false;
        endNetworkActivity();
    }
};

// Auth Actions
export const login = async (email: string, password?: string) => {
    const response = await fetch(`${API_BASE_URL}/Auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        return false;
    }

    const data = (await response.json()) as Partial<AuthResponse>;
    const normalizedUser = normalizeUserResponse(data.user);
    if (!normalizedUser) {
        return false;
    }

    appStore.currentUser = normalizedUser;
    appStore.accessToken = data.accessToken ?? null;
    appStore.refreshToken = data.refreshToken ?? null;
    appStore.isAuthenticated = true;

    persistAuthSession({
        user: normalizedUser,
        accessToken: data.accessToken ?? null,
        refreshToken: data.refreshToken ?? null
    });

    void loadUnitColorSettings();
    void loadAvailableProjectIds();
    if (normalizedUser.role === 'admin') {
        void loadUsers();
    }

    return true;
};

export const logout = () => {
    appStore.currentUser = null;
    appStore.accessToken = null;
    appStore.refreshToken = null;
    appStore.isAuthenticated = false;
    syncUnitColorSettingsState(defaultUnitColorSettings());
    localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const ensureAuthInitialized = async () => {
    if (authInitializationPromise) {
        return authInitializationPromise;
    }

    authInitializationPromise = (async () => {
        appStore.isAuthInitializing = true;
        beginNetworkActivity();
        const session = readAuthSession();
        if (!session) {
            return;
        }

        applyAuthSession(session);

        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}/Auth/me`, {
                method: 'GET',
                headers: {
                    ...(session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {})
                }
            });

            if (handleUnauthorizedResponse(response)) return;
            if (!response.ok) return;

            const refreshedUser = normalizeUserResponse(await response.json());
            if (!refreshedUser) return;

            const refreshedSession: AuthSession = {
                user: refreshedUser,
                accessToken: session.accessToken,
                refreshToken: session.refreshToken
            };

            applyAuthSession(refreshedSession);
            persistAuthSession(refreshedSession);
        } catch (_error) {
            // Keep the cached session if the refresh call fails.
        }

        await Promise.all([
            loadUnitColorSettings(),
            loadAvailableProjectIds(),
            ...(appStore.currentUser?.role === 'admin' ? [loadUsers()] : [])
        ]);
    })();

    authInitializationPromise = authInitializationPromise.finally(() => {
        appStore.isAuthInitializing = false;
        endNetworkActivity();
    });

    return authInitializationPromise;
};

export const checkAuth = () => {
    void ensureAuthInitialized();
};

// Auth Getters
export const getUserRole = () => appStore.currentUser?.role || 'viewer';
export const isAdmin = () => getUserRole() === 'admin';
export const isEditor = () => getUserRole() === 'editor' || isAdmin();
export const isViewer = () => getUserRole() === 'viewer';
export const isSales = () => getUserRole() === 'ventas';

export const canManageUsers = () => isAdmin();
export const canEditData = () => isEditor();
export const canDeleteData = () => isAdmin();
export const canOpenDashboard = () => isAdmin() || isEditor() || isViewer() || isSales();
export const canOpenEditor = () => isAdmin() || isEditor() || isViewer();
export const canOpenProjectUnits = () => isAdmin() || isEditor() || isViewer();

export const loadUsers = async () => {
    if (usersLoadPromise) {
        return usersLoadPromise;
    }

    usersLoadPromise = (async () => {
    beginNetworkActivity();
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/Users`, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (handleUnauthorizedResponse(response)) {
            return [];
        }
        if (!response.ok) {
            return appStore.users;
        }

        const payload = await response.json();
        const users = normalizeUsersResponse(payload);
        if (users.length > 0) {
            appStore.users = users;
        }
        return appStore.users;
    } catch (_error) {
        return appStore.users;
    } finally {
        usersLoadPromise = null;
        endNetworkActivity();
    }
    })();

    return usersLoadPromise;
};

// Project Management Actions
export const loadProjects = async () => {
    if (projectsLoadPromise) {
        return projectsLoadPromise;
    }

    projectsLoadPromise = (async () => {
    beginNetworkActivity();
    appStore.isProjectsLoading = true;
    appStore.projectsErrorMessage = '';
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/Projects`, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (handleUnauthorizedResponse(response)) {
            return [];
        }
        if (!response.ok) {
            appStore.projectsErrorMessage = 'No se pudieron cargar los proyectos.';
            return appStore.projects;
        }

        const payload = await response.json();
        const projects = normalizeProjectsResponse(payload);
        syncProjectsState(projects);
        return projects;
    } catch (_error) {
        appStore.projectsErrorMessage = 'No se pudieron cargar los proyectos.';
        return appStore.projects;
    } finally {
        projectsLoadPromise = null;
        appStore.isProjectsLoading = false;
        endNetworkActivity();
    }
    })();

    return projectsLoadPromise;
};

export const loadProject = async (projectId: string) => {
    beginNetworkActivity();
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/Projects/${projectId}`, {
            headers: {
                ...getAuthHeaders()
            }
        }, PROJECT_DETAIL_FETCH_TIMEOUT_MS);

        if (handleUnauthorizedResponse(response)) {
            return null;
        }
        if (!response.ok) {
            return appStore.projects.find(project => project.id === projectId) ?? null;
        }

        const project = normalizeProjectResponse(await response.json());
        if (!project) {
            return appStore.projects.find(item => item.id === projectId) ?? null;
        }

        upsertProjectState(project);
        return project;
    } catch (_error) {
        return appStore.projects.find(project => project.id === projectId) ?? null;
    } finally {
        endNetworkActivity();
    }
};

export const loadProjectLayout = async (projectId: string) => {
    beginNetworkActivity();
    try {
        const response = await fetch(`${API_BASE_URL}/Projects/${projectId}/layout`, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (handleUnauthorizedResponse(response)) {
            return null;
        }
        if (!response.ok) {
            let message = '';
            try {
                const payload = await response.json();
                message = typeof payload?.message === 'string' ? payload.message : '';
            } catch (_parseError) {
                // Ignore malformed error payloads.
            }

            const lowered = message.toLowerCase();
            const isMissingLayoutMessage = lowered.includes('does not have a layout configured')
                || lowered.includes('no tiene un layout configurado')
                || (lowered.includes('layout') && lowered.includes('no tiene'));
            if (isMissingLayoutMessage) {
                if (appStore.currentProjectId === projectId) {
                    appStore.currentProjectLayoutStatus = 'missing';
                    appStore.currentProjectLayoutMessage = 'Este proyecto aun no tiene un layout configurado. Puedes comenzar a crearlo desde el editor.';
                }
                return null;
            }

            if (appStore.currentProjectId === projectId) {
                appStore.currentProjectLayoutStatus = 'error';
                appStore.currentProjectLayoutMessage = 'No se pudo cargar el layout del proyecto.';
            }
            return null;
        }

        const payload = await response.json();
        const layout = normalizeLayoutResponse(payload);

        if (appStore.currentProjectId !== projectId) {
            return layout;
        }

        syncProjectLayoutState(projectId, layout.buildings, layout.gridSize, layout.blueprintTransform);
        linkProjectApartmentsToLayout(projectId);
        appStore.currentProjectLayoutStatus = 'ready';
        appStore.currentProjectLayoutMessage = '';
        return layout;
    } catch (_error) {
        if (appStore.currentProjectId === projectId) {
            appStore.currentProjectLayoutStatus = 'error';
            appStore.currentProjectLayoutMessage = 'No se pudo cargar el layout del proyecto.';
        }
        return null;
    } finally {
        endNetworkActivity();
    }
};

export const loadProjectApartments = async (projectId: string) => {
    beginNetworkActivity();
    appStore.isApartmentsLoadingByProject[projectId] = true;
    appStore.isApartmentsLoading = appStore.currentProjectId === projectId;
    appStore.apartmentsErrorByProject[projectId] = '';
    try {
        const response = await fetch(`${API_BASE_URL}/Projects/${projectId}/apartments`, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (handleUnauthorizedResponse(response)) {
            return [];
        }
        if (!response.ok) {
            appStore.apartmentsErrorByProject[projectId] = 'No se pudieron cargar los apartamentos del proyecto.';
            return appStore.detailedUnitsByProject[projectId] ?? [];
        }

        const payload = await response.json();
        const apartments = normalizeDetailedUnitsResponse(payload);

        appStore.detailedUnitsByProject[projectId] = apartments;
        if (appStore.currentProjectId === projectId) {
            syncCurrentProjectApartments(projectId);
            linkProjectApartmentsToLayout(projectId);
        }
        return apartments;
    } catch (_error) {
        appStore.apartmentsErrorByProject[projectId] = 'No se pudieron cargar los apartamentos del proyecto.';
        return appStore.detailedUnitsByProject[projectId] ?? [];
    } finally {
        appStore.isApartmentsLoadingByProject[projectId] = false;
        appStore.isApartmentsLoading = appStore.currentProjectId ? Boolean(appStore.isApartmentsLoadingByProject[appStore.currentProjectId]) : false;
        endNetworkActivity();
    }
};

export const loadProjectApartmentStats = async (projectId: string) => {
    beginNetworkActivity();
    try {
        const response = await fetch(`${API_BASE_URL}/Projects/${projectId}/apartments/stats`, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (handleUnauthorizedResponse(response)) {
            return null;
        }

        if (!response.ok) {
            return appStore.apartmentStatsByProject[projectId] ?? null;
        }

        const payload = await response.json() as Partial<ApiApartmentStatsResponse>;
        const normalized: ApiApartmentStatsResponse = {
            projectId: String(payload.projectId ?? projectId),
            edificios: Number(payload.edificios ?? 0),
            vendida: Number(payload.vendida ?? 0),
            totalUnidades: Number(payload.totalUnidades ?? 0),
            unidadesEntregadas: Number(payload.unidadesEntregadas ?? 0),
            unidadesConSaldo: Number(payload.unidadesConSaldo ?? 0),
            unidadesEnInspeccion: Number(payload.unidadesEnInspeccion ?? 0),
            disponiblesObservacion: Number(payload.disponiblesObservacion ?? 0)
        };

        appStore.apartmentStatsByProject[projectId] = normalized;
        return normalized;
    } catch (_error) {
        return appStore.apartmentStatsByProject[projectId] ?? null;
    } finally {
        endNetworkActivity();
    }
};

export const generateProjectLayoutFromExcel = async (file: File) => {
    const projectId = appStore.currentProjectId;
    if (!projectId) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'Debes seleccionar un proyecto antes de generar el layout desde Excel.';
        return null;
    }

    try {
        const XLSX = await loadXlsx();
        const fileBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(fileBuffer, { type: 'array' });
        const targetSheetName = workbook.SheetNames.find((sheetName) => sheetName.trim().toLowerCase() === projectId.trim().toLowerCase());

        if (!targetSheetName) {
            appStore.currentProjectLayoutStatus = 'error';
            appStore.currentProjectLayoutMessage = `No se encontró la hoja "${projectId}" dentro del archivo Excel.`;
            return null;
        }

        const sheet = workbook.Sheets[targetSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false }) as unknown[][];
        const parsedRows = parseExcelSheetRows(rows);

        if (parsedRows.length === 0) {
            appStore.currentProjectLayoutStatus = 'error';
            appStore.currentProjectLayoutMessage = 'La hoja no contiene filas válidas con columnas de Edificio y Unidad.';
            return null;
        }

        const generatedBuildings = buildLayoutFromExcelRows(projectId, parsedRows, appStore.detailedUnits);
        syncProjectLayoutState(projectId, generatedBuildings);
        appStore.selectedBuildingId = null;
        appStore.selectedUnitId = null;
        appStore.currentProjectLayoutStatus = 'ready';
        appStore.currentProjectLayoutMessage = `Layout generado desde Excel: ${generatedBuildings.length} edificios y ${parsedRows.length} unidades.`;

        return {
            sheet: targetSheetName,
            buildings: generatedBuildings.length,
            units: parsedRows.length
        };
    } catch (_error) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'No se pudo procesar el archivo Excel.';
        return null;
    }
};

export const generateProjectLayoutFromApartments = async () => {
    const projectId = appStore.currentProjectId;
    if (!projectId) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'Debes seleccionar un proyecto antes de generar el layout desde la API.';
        return null;
    }

    const apartments = await getApartmentsForLayoutGeneration(projectId);
    const parsedRows = buildLayoutRowsFromApartments(apartments);
    if (parsedRows.length === 0) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'No hay apartamentos válidos para generar el layout desde la API.';
        return null;
    }

    const generatedBuildings = buildLayoutFromExcelRows(projectId, parsedRows, apartments);
    syncProjectLayoutState(projectId, generatedBuildings);
    appStore.selectedBuildingId = null;
    appStore.selectedUnitId = null;
    appStore.currentProjectLayoutStatus = 'ready';
    appStore.currentProjectLayoutMessage = `Layout generado desde API: ${generatedBuildings.length} edificios y ${parsedRows.length} unidades.`;

    return {
        source: `Endpoint /Projects/${projectId}/apartments`,
        buildings: generatedBuildings.length,
        units: parsedRows.length
    };
};

export const previewProjectLayoutFromExcel = async (file: File) => {
    const projectId = appStore.currentProjectId;
    if (!projectId) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'Debes seleccionar un proyecto antes de generar el layout desde Excel.';
        return null;
    }

    try {
        const XLSX = await loadXlsx();
        const fileBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(fileBuffer, { type: 'array' });
        const targetSheetName = workbook.SheetNames.find((sheetName) => sheetName.trim().toLowerCase() === projectId.trim().toLowerCase());

        if (!targetSheetName) {
            appStore.currentProjectLayoutStatus = 'error';
            appStore.currentProjectLayoutMessage = `No se encontró la hoja "${projectId}" dentro del archivo Excel.`;
            return null;
        }

        const sheet = workbook.Sheets[targetSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false }) as unknown[][];
        const parsedRows = parseExcelSheetRows(rows);

        if (parsedRows.length === 0) {
            appStore.currentProjectLayoutStatus = 'error';
            appStore.currentProjectLayoutMessage = 'La hoja no contiene filas válidas con columnas de Edificio y Unidad.';
            return null;
        }

        const generatedBuildings = buildLayoutFromExcelRows(projectId, parsedRows, appStore.detailedUnits);
        const projectBuildings = appStore.buildings.filter((building) => building.projectId === projectId);
        const currentUnits = projectBuildings.reduce((acc, building) => acc + building.units.length, 0);

        return {
            sheet: targetSheetName,
            buildings: generatedBuildings.length,
            units: parsedRows.length,
            currentBuildings: projectBuildings.length,
            currentUnits
        };
    } catch (_error) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'No se pudo procesar el archivo Excel.';
        return null;
    }
};

export const previewProjectLayoutFromApartments = async () => {
    const projectId = appStore.currentProjectId;
    if (!projectId) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'Debes seleccionar un proyecto antes de generar el layout desde la API.';
        return null;
    }

    const apartments = await getApartmentsForLayoutGeneration(projectId);
    const parsedRows = buildLayoutRowsFromApartments(apartments);
    if (parsedRows.length === 0) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'No hay apartamentos válidos para generar el layout desde la API.';
        return null;
    }

    const generatedBuildings = buildLayoutFromExcelRows(projectId, parsedRows, apartments);
    const projectBuildings = appStore.buildings.filter((building) => building.projectId === projectId);
    const currentUnits = projectBuildings.reduce((acc, building) => acc + building.units.length, 0);

    return {
        source: `Endpoint /Projects/${projectId}/apartments`,
        buildings: generatedBuildings.length,
        units: parsedRows.length,
        currentBuildings: projectBuildings.length,
        currentUnits
    };
};

export const saveProjectLayout = async () => {
    const projectId = appStore.currentProjectId;
    if (!projectId) {
        return null;
    }

    const projectBuildings = appStore.buildings.filter(building => building.projectId === projectId);
    appStore.currentProjectLayoutStatus = 'saving';
    appStore.currentProjectLayoutMessage = '';
    beginNetworkActivity();

    try {
        const response = await fetch(`${API_BASE_URL}/Projects/${projectId}/layout`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                projectId,
                gridSize: appStore.gridSize,
                blueprintTransform: appStore.blueprintTransform,
                buildings: projectBuildings
            })
        });

        if (handleUnauthorizedResponse(response)) {
            return null;
        }
        if (!response.ok) {
            let message = '';
            try {
                const payload = await response.json();
                message = typeof payload?.message === 'string' ? payload.message : '';
            } catch (_parseError) {
                // Ignore malformed error payloads.
            }

            appStore.currentProjectLayoutStatus = 'error';
            appStore.currentProjectLayoutMessage = message || 'No se pudo guardar el layout del proyecto.';
            return null;
        }

        const payload = await response.json();
        const layout = normalizeLayoutResponse(payload);
        syncProjectLayoutState(projectId, layout.buildings.length > 0 ? layout.buildings : projectBuildings, layout.gridSize ?? appStore.gridSize, layout.blueprintTransform ?? appStore.blueprintTransform);
        appStore.currentProjectLayoutStatus = 'ready';
        appStore.currentProjectLayoutMessage = 'Layout guardado correctamente.';
        return layout;
    } catch (_error) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'No se pudo guardar el layout del proyecto.';
        return null;
    } finally {
        endNetworkActivity();
    }
};

export const loadAvailableProjectIds = async () => {
    if (availableProjectIdsLoadPromise) {
        return availableProjectIdsLoadPromise;
    }

    availableProjectIdsLoadPromise = (async () => {
    beginNetworkActivity();
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/Apartamentos/sheets`, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (handleUnauthorizedResponse(response)) {
            return [];
        }
        if (!response.ok) {
            return appStore.availableProjectIds;
        }

        const payload = await response.json();
        const ids = normalizeStringListResponse(payload);

        if (ids.length > 0) {
            appStore.availableProjectIds = ids;
        }

        return appStore.availableProjectIds;
    } catch (_error) {
        return appStore.availableProjectIds;
    } finally {
        availableProjectIdsLoadPromise = null;
        endNetworkActivity();
    }
    })();

    return availableProjectIdsLoadPromise;
};

export const addProject = async (project: Project) => {
    try {
        const response = await fetch(`${API_BASE_URL}/Projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(project)
        });

        if (!response.ok) {
            throw new Error('No se pudo crear el proyecto.');
        }
        const createdProject = normalizeProjectResponse(await response.json()) ?? project;
        detailedProjectIds.add(createdProject.id);
        appStore.projects.push(createdProject);
        return createdProject;
    } catch (_error) {
        return null;
    }
};

export const updateProject = async (id: string, updates: Partial<Project>) => {
    const project = appStore.projects.find(p => p.id === id);
    if (!project) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/Projects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ ...project, ...updates })
        });

        if (!response.ok) {
            throw new Error('No se pudo actualizar el proyecto.');
        }
        const updatedProject = normalizeProjectResponse(await response.json()) ?? { ...project, ...updates };
        detailedProjectIds.add(updatedProject.id);
        Object.assign(project, updatedProject);
        return updatedProject;
    } catch (_error) {
        return null;
    }
};

export const deleteProject = async (id: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/Projects/${id}`, {
            method: 'DELETE',
            headers: {
                ...getAuthHeaders()
            }
        });

        if (!response.ok) {
            throw new Error('No se pudo eliminar el proyecto.');
        }
        const index = appStore.projects.findIndex(p => p.id === id);
        if (index > -1) {
            appStore.projects.splice(index, 1);
        }
        detailedProjectIds.delete(id);
        return true;
    } catch (_error) {
        return false;
    }
};
