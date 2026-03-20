import { reactive } from 'vue';
import type { Building, Unit, UnitStatus, User, Project, DetailedUnit } from '../models/types';

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
const AUTH_STORAGE_KEY = 'auth_session';
let authInitializationPromise: Promise<void> | null = null;
let projectsLoadPromise: Promise<Project[]> | null = null;
let usersLoadPromise: Promise<User[]> | null = null;
let availableProjectIdsLoadPromise: Promise<string[]> | null = null;

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
            id: normalizedId
        };
    }

    const normalizedId = normalizeId(candidate.id);
    if (normalizedId !== null && candidate.name && candidate.email && candidate.role) {
        return {
            ...(candidate as User),
            id: normalizedId
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

const syncProjectsState = (projects: Project[]) => {
    appStore.projects = projects;
    appStore.availableProjectIds = projects.map(project => project.id);
};

const syncProjectLayoutState = (projectId: string, buildings: Building[], gridSize?: number) => {
    const preservedBuildings = appStore.buildings.filter(building => building.projectId !== projectId);
    appStore.buildings = [...preservedBuildings, ...buildings];

    if (typeof gridSize === 'number') {
        appStore.gridSize = gridSize;
    }
};

const clearProjectLayoutState = (projectId: string) => {
    appStore.buildings = appStore.buildings.filter(building => building.projectId !== projectId);
};

const clearProjectApartmentState = () => {
    appStore.detailedUnits = [];
};

const normalizeProjectsResponse = (payload: unknown): Project[] => {
    if (Array.isArray(payload)) {
        return payload as Project[];
    }

    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const candidate = payload as {
        projects?: Project[];
        data?: Project[];
        items?: Project[];
        result?: Project[];
    };

    return candidate.projects
        ?? candidate.data
        ?? candidate.items
        ?? candidate.result
        ?? [];
};

const normalizeUsersResponse = (payload: unknown): User[] => {
    if (Array.isArray(payload)) {
        return payload as User[];
    }

    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const candidate = payload as {
        users?: User[];
        data?: User[];
        items?: User[];
        result?: User[];
    };

    return candidate.users
        ?? candidate.data
        ?? candidate.items
        ?? candidate.result
        ?? [];
};

const normalizeStringListResponse = (payload: unknown): string[] => {
    if (Array.isArray(payload)) {
        return payload.filter(item => typeof item === 'string') as string[];
    }

    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const candidate = payload as {
        sheets?: unknown;
        data?: unknown;
        items?: unknown;
        result?: unknown;
    };

    const possibleLists = [
        candidate.sheets,
        candidate.data,
        candidate.items,
        candidate.result
    ];

    for (const list of possibleLists) {
        if (Array.isArray(list)) {
            return list.filter(item => typeof item === 'string') as string[];
        }
    }

    return [];
};

const normalizeProjectResponse = (payload: unknown): Project | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const candidate = payload as { project?: Project } & Partial<Project>;

    if (candidate.project && candidate.project.id) {
        return candidate.project;
    }

    if (candidate.id && candidate.nombre && candidate.direccion && candidate.provincia && candidate.municipio && candidate.imagenPlano !== undefined) {
        return candidate as Project;
    }

    return null;
};

type ProjectLayoutResponse = {
    projectId?: string;
    gridSize?: number;
    buildings?: Building[];
    layout?: {
        gridSize?: number;
        buildings?: Building[];
    };
};

const normalizeLayoutResponse = (payload: unknown): { gridSize?: number; buildings: Building[] } => {
    if (!payload || typeof payload !== 'object') {
        return { buildings: [] };
    }

    const candidate = payload as ProjectLayoutResponse;
    const source = candidate.layout ?? candidate;
    const buildings = Array.isArray(source.buildings) ? source.buildings : [];

    return {
        gridSize: source.gridSize,
        buildings: buildings.map((building) => ({
            ...building,
            projectId: building.projectId ?? candidate.projectId ?? appStore.currentProjectId ?? '',
            rotationY: building.rotationY ?? 0,
            units: Array.isArray(building.units)
                ? building.units.map((unit) => ({
                    ...unit,
                    buildingId: unit.buildingId ?? building.id
                }))
                : []
        }))
    };
};

const normalizeDetailedUnitsResponse = (payload: unknown): DetailedUnit[] => {
    if (Array.isArray(payload)) {
        return payload as DetailedUnit[];
    }

    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const candidate = payload as {
        apartments?: DetailedUnit[];
        detailedUnits?: DetailedUnit[];
        data?: DetailedUnit[];
        items?: DetailedUnit[];
        result?: DetailedUnit[];
    };

    return candidate.apartments
        ?? candidate.detailedUnits
        ?? candidate.data
        ?? candidate.items
        ?? candidate.result
        ?? [];
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

const linkProjectApartmentsToLayout = (projectId: string) => {
    const projectBuildings = appStore.buildings.filter(building => building.projectId === projectId);

    projectBuildings.forEach(building => {
        building.units.forEach(unit => {
            const candidates = getApartmentCandidates(building, unit);
            const matchedApartment = appStore.detailedUnits.find(apartment => {
                const apartmentKey = `${apartment.edificio}-${apartment.unidad}`;
                return candidates.has(apartment.codUnidad)
                    || candidates.has(apartmentKey)
                    || candidates.has(apartment.codUnidad?.trim())
                    || apartment.codUnidad.includes(building.projectId)
                    || apartmentKey === unit.name;
            });

            unit.detailedUnitId = matchedApartment ? matchedApartment.id : null;
        });
    });
};

interface AppState {
    appMode: 'edit' | 'view';
    dragBuildingsEnabled: boolean;
    currentProjectId: string | null;
    buildings: Building[];
    users: User[];
    projects: Project[];
    detailedUnits: DetailedUnit[];
    availableProjectIds: string[];
    currentUser: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    selectedBuildingId: string | null;
    selectedUnitId: string | null;
    gridSize: number;
    currentProjectLayoutStatus: 'idle' | 'loading' | 'saving' | 'ready' | 'missing' | 'error';
    currentProjectLayoutMessage: string;
    visualFilters: {
        status: UnitStatus | null;
        bank: string | null;
        hasDebt: boolean | null;
        enInspeccion: boolean | null;
        legal: boolean | null;
        titulo: boolean | null;
        descargadaDGII: boolean | null;
        saldo: boolean | null;
    };
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
    currentUser: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    selectedBuildingId: null,
    selectedUnitId: null,
    gridSize: 300,
    currentProjectLayoutStatus: 'idle',
    currentProjectLayoutMessage: '',
    visualFilters: {
        status: null,
        bank: null,
        hasDebt: null,
        enInspeccion: null,
        legal: null,
        titulo: null,
        descargadaDGII: null,
        saldo: null
    }
});

export const selectProject = (id: string | null) => {
    appStore.currentProjectId = id;
    appStore.selectedBuildingId = null;
    appStore.selectedUnitId = null;

    if (id) {
        clearProjectLayoutState(id);
        clearProjectApartmentState();
        appStore.currentProjectLayoutStatus = 'loading';
        appStore.currentProjectLayoutMessage = '';
        void loadProjectLayout(id);
        void loadProjectApartments(id);
    } else {
        appStore.currentProjectLayoutStatus = 'idle';
        appStore.currentProjectLayoutMessage = '';
    }
};

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
        dimensions: { width: 3, depth: 3, height: 8 }, // 3x3 default
        rotationY: 0,
        units: []
    };
    
    // Add default unit
    const defaultUnit: Unit = {
        id: `unt_${generateId()}`,
        detailedUnitId: null,
        buildingId: buildingId,
        name: `Unidad 1`,
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

export const setVisualFilters = (filters: Partial<AppState['visualFilters']>) => {
    appStore.visualFilters = { ...appStore.visualFilters, ...filters };
};

export const addUnitToBuilding = (buildingId: string) => {
    const bld = appStore.buildings.find(b => b.id === buildingId);
    if (!bld) return null;

    const newUnit: Unit = {
        id: `unt_${generateId()}`,
        detailedUnitId: null,
        buildingId: bld.id,
        name: `Apto ${bld.units.length + 1}`,
        status: 'available',
        paid: false
    };

    bld.units.push(newUnit);
    return newUnit;
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
    const nextUser = user ? { ...user, ...updates, id } : null;

    try {
        const response = await fetch(`${API_BASE_URL}/Users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                ...(user ?? { id }),
                ...updates,
                id
            })
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

    if (user) {
        Object.assign(user, updates);
        return user;
    }

    return nextUser;
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

    void loadProjects();
    void loadAvailableProjectIds();
    void loadUsers();

    return true;
};

export const logout = () => {
    appStore.currentUser = null;
    appStore.accessToken = null;
    appStore.refreshToken = null;
    appStore.isAuthenticated = false;
    localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const ensureAuthInitialized = async () => {
    if (authInitializationPromise) {
        return authInitializationPromise;
    }

    authInitializationPromise = (async () => {
        const session = readAuthSession();
        if (!session) {
            return;
        }

        applyAuthSession(session);

        try {
            const response = await fetch(`${API_BASE_URL}/Auth/me`, {
                method: 'GET',
                headers: {
                    ...(session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {})
                }
            });

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
            loadProjects(),
            loadAvailableProjectIds(),
            loadUsers()
        ]);
    })();

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

export const canManageUsers = () => isAdmin();
export const canEditData = () => isEditor();
export const canDeleteData = () => isAdmin();

export const loadUsers = async () => {
    if (usersLoadPromise) {
        return usersLoadPromise;
    }

    usersLoadPromise = (async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/Users`, {
            headers: {
                ...getAuthHeaders()
            }
        });

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
    try {
        const response = await fetch(`${API_BASE_URL}/Projects`, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (!response.ok) {
            return appStore.projects;
        }

        const payload = await response.json();
        const projects = normalizeProjectsResponse(payload);
        syncProjectsState(projects);
        return projects;
    } catch (_error) {
        return appStore.projects;
    } finally {
        projectsLoadPromise = null;
    }
    })();

    return projectsLoadPromise;
};

export const loadProjectLayout = async (projectId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/Projects/${projectId}/layout`, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (!response.ok) {
            let message = '';
            try {
                const payload = await response.json();
                message = typeof payload?.message === 'string' ? payload.message : '';
            } catch (_parseError) {
                // Ignore malformed error payloads.
            }

            if (message.toLowerCase().includes('does not have a layout configured')) {
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

        syncProjectLayoutState(projectId, layout.buildings, layout.gridSize);
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
    }
};

export const loadProjectApartments = async (projectId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/Projects/${projectId}/apartments`, {
            headers: {
                ...getAuthHeaders()
            }
        });

        if (!response.ok) {
            return appStore.detailedUnits;
        }

        const payload = await response.json();
        const apartments = normalizeDetailedUnitsResponse(payload);

        if (appStore.currentProjectId !== projectId) {
            return apartments;
        }

        appStore.detailedUnits = apartments;
        linkProjectApartmentsToLayout(projectId);
        return apartments;
    } catch (_error) {
        return appStore.detailedUnits;
    }
};

export const saveProjectLayout = async () => {
    const projectId = appStore.currentProjectId;
    if (!projectId) {
        return null;
    }

    const projectBuildings = appStore.buildings.filter(building => building.projectId === projectId);
    appStore.currentProjectLayoutStatus = 'saving';
    appStore.currentProjectLayoutMessage = '';

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
                buildings: projectBuildings
            })
        });

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
        syncProjectLayoutState(projectId, layout.buildings.length > 0 ? layout.buildings : projectBuildings, layout.gridSize ?? appStore.gridSize);
        appStore.currentProjectLayoutStatus = 'ready';
        appStore.currentProjectLayoutMessage = 'Layout guardado correctamente.';
        return layout;
    } catch (_error) {
        appStore.currentProjectLayoutStatus = 'error';
        appStore.currentProjectLayoutMessage = 'No se pudo guardar el layout del proyecto.';
        return null;
    }
};

export const loadAvailableProjectIds = async () => {
    if (availableProjectIdsLoadPromise) {
        return availableProjectIdsLoadPromise;
    }

    availableProjectIdsLoadPromise = (async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/Apartamentos/sheets`, {
            headers: {
                ...getAuthHeaders()
            }
        });

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

        if (response.ok) {
            const createdProject = normalizeProjectResponse(await response.json()) ?? project;
            appStore.projects.push(createdProject);
            appStore.availableProjectIds = appStore.projects.map(item => item.id);
            return createdProject;
        }
    } catch (_error) {
        // Fall back to optimistic local update below.
    }

    appStore.projects.push(project);
    appStore.availableProjectIds = appStore.projects.map(item => item.id);
    return project;
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

        if (response.ok) {
            const updatedProject = normalizeProjectResponse(await response.json()) ?? { ...project, ...updates };
            Object.assign(project, updatedProject);
            return updatedProject;
        }
    } catch (_error) {
        // Fall back to optimistic local update below.
    }

    Object.assign(project, updates);
    return project;
};

export const deleteProject = async (id: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/Projects/${id}`, {
            method: 'DELETE',
            headers: {
                ...getAuthHeaders()
            }
        });

        if (response.ok) {
            const index = appStore.projects.findIndex(p => p.id === id);
            if (index > -1) {
                appStore.projects.splice(index, 1);
                appStore.availableProjectIds = appStore.projects.map(item => item.id);
            }
            return;
        }
    } catch (_error) {
        // Fall back to local removal below.
    }

    const index = appStore.projects.findIndex(p => p.id === id);
    if (index > -1) {
        appStore.projects.splice(index, 1);
        appStore.availableProjectIds = appStore.projects.map(item => item.id);
    }
};
