import { reactive } from 'vue';
import type { Building, Unit, UnitStatus, User, Project, DetailedUnit } from '../models/types';
import rawUnitData from '../assets/nt8-proyect-buildings.json';

// Process unit data to ensure unique IDs (since they are 0 in the JSON)
const unitData: DetailedUnit[] = (rawUnitData as any[]).map((u, index) => ({
    ...u,
    id: index + 1
}));

interface AppState {
    appMode: 'edit' | 'view';
    currentProjectId: string | null;
    buildings: Building[];
    users: User[];
    projects: Project[];
    detailedUnits: DetailedUnit[];
    availableProjectIds: string[];
    currentUser: User | null;
    isAuthenticated: boolean;
    selectedBuildingId: string | null;
    selectedUnitId: string | null;
    gridSize: number;
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
// ... (generateUnits function stays the same) ...
const generateUnits = (buildingId: string, prefix: string, count: number) => {
    return Array.from({ length: count }, (_, i) => {
        const status = i < count * 0.4 ? 'delivered' : 
                     i < count * 0.6 ? 'financing' : 
                     i < count * 0.75 ? 'inspection' : 
                     i < count * 0.9 ? 'sold' : 'available';
        
        const floor = Math.floor(i / 3) + 1;
        const banks = ["Apap", "Popular", "BHD", "Alnap", "Banreservas", "Santa Cruz", "Scotiabank", "Cibao", "Banesco"];
        const bank = banks[Math.floor(Math.random() * banks.length)];
        
        return {
            id: `unt_${prefix.toLowerCase()}_${i}`,
            detailedUnitId: null,
            buildingId,
            name: `${prefix}-${100 + i}`,
            status: status as UnitStatus,
            paid: status === 'delivered' || Math.random() > 0.5,
            balance: (status === 'financing' || Math.random() > 0.7) ? 40000 + (Math.random() * 80000) : 0,
            bank: bank,
            floor: floor,
            hasDebt: status === 'financing' || Math.random() > 0.7,
            enInspeccion: Math.random() > 0.8,
            legal: Math.random() > 0.6,
            titulo: Math.random() > 0.9,
            descargadaDGII: Math.random() > 0.7,
            saldo: status === 'delivered' || Math.random() > 0.5
        };
    });
};

export const appStore = reactive<AppState>({
    appMode: 'view',
    currentProjectId: null,
    buildings: [
        // NT8 High-Density Master Plan (3x3 footprint)
        { id: 'bld_1', projectId: 'NT8', name: 'Bloque DN-A1', position: { x: -8, z: -25 }, dimensions: { width: 3, depth: 3, height: 12 }, units: generateUnits('bld_1', 'DN-A1', 36) },
        { id: 'bld_2', projectId: 'NT8', name: 'Bloque DN-A2', position: { x: -8, z: -15 }, dimensions: { width: 3, depth: 3, height: 12 }, units: generateUnits('bld_2', 'DN-A2', 36) },
        { id: 'bld_3', projectId: 'NT8', name: 'Bloque DN-A3', position: { x: -8, z: -5 }, dimensions: { width: 3, depth: 3, height: 15 }, units: generateUnits('bld_3', 'DN-A3', 45) },
        { id: 'bld_4', projectId: 'NT8', name: 'Bloque DN-A4', position: { x: -8, z: 5 }, dimensions: { width: 3, depth: 3, height: 15 }, units: generateUnits('bld_4', 'DN-A4', 45) },
        { id: 'bld_5', projectId: 'NT8', name: 'Bloque DN-A5', position: { x: -8, z: 15 }, dimensions: { width: 3, depth: 3, height: 15 }, units: generateUnits('bld_5', 'DN-A5', 45) },
        
        { id: 'bld_6', projectId: 'NT8', name: 'Bloque DO-B1', position: { x: 8, z: -25 }, dimensions: { width: 3, depth: 3, height: 12 }, units: generateUnits('bld_6', 'DO-B1', 36) },
        { id: 'bld_7', projectId: 'NT8', name: 'Bloque DO-B2', position: { x: 8, z: -15 }, dimensions: { width: 3, depth: 3, height: 12 }, units: generateUnits('bld_7', 'DO-B2', 36) },
        { id: 'bld_8', projectId: 'NT8', name: 'Bloque DO-B3', position: { x: 8, z: -5 }, dimensions: { width: 3, depth: 3, height: 18 }, units: generateUnits('bld_8', 'DO-B3', 54) },
        { id: 'bld_9', projectId: 'NT8', name: 'Bloque DO-B4', position: { x: 8, z: 5 }, dimensions: { width: 3, depth: 3, height: 18 }, units: generateUnits('bld_9', 'DO-B4', 54) },
        { id: 'bld_10', projectId: 'NT8', name: 'Bloque DO-B5', position: { x: 8, z: 15 }, dimensions: { width: 3, depth: 3, height: 18 }, units: generateUnits('bld_10', 'DO-B5', 54) },

        { id: 'bld_11', projectId: 'NT8', name: 'Torre Central A', position: { x: 0, z: -35 }, dimensions: { width: 3, depth: 3, height: 25 }, units: generateUnits('bld_11', 'TC-A', 75) },
        { id: 'bld_12', projectId: 'NT8', name: 'Torre Central B', position: { x: 0, z: 25 }, dimensions: { width: 3, depth: 3, height: 25 }, units: generateUnits('bld_12', 'TC-B', 75) }
    ],
    users: [
        { id: 'usr_1', name: 'Administrador', email: 'admin@example.com', role: 'admin', password: 'admin123' },
        { id: 'usr_2', name: 'Editor de Proyectos', email: 'editor@example.com', role: 'editor', password: 'editor123' },
        { id: 'usr_3', name: 'Visitante', email: 'viewer@example.com', role: 'viewer', password: 'viewer123' },
    ],
    projects: [
        { id: 'NT8', nombre: 'Proyecto NT8', direccion: 'Santo Domingo DN', provincia: 'Distrito Nacional', municipio: 'Santo Domingo Center', imagenPlano: '' },
    ],
    availableProjectIds: ['NT8'],
    detailedUnits: [
        ...unitData,
        // PRJ_001 Dummy Detailed Units
        {
            id: 999001,
            codUnidad: 'PRJ_001-PALM-A101',
            edificio: 'PALM-A',
            unidad: '101',
            metraje: 95.5,
            estado: 'Vendido',
            nombre: 'Carlos Ramirez',
            telefono: '809-555-9001',
            correo: 'carlos@example.com',
            cedula: '402-0000000-1',
            precio: 5200000,
            inicial: 1000000,
            inicialDolar: 17000,
            pagado: 1200000,
            adeudado: 4000000,
            fechaCompletaInicial: null,
            fechaInicioVaciados: null,
            fechaEntregaInspeccion: null,
            fechaLegal: null,
            fechaGobierno: null,
            fechaMicelaneos: null,
            fechaInspeccion1: null,
            fechaInspeccion2: null,
            fechaFormaPago: null,
            iniciadoVaciados: true,
            enInspeccion: false,
            inspeccion1: true,
            inspeccion2: false,
            legal: true,
            gobierno: false,
            micelaneos: true,
            titulo: false,
            responsableLegal: 'Wendy',
            responsableGobierno: '',
            responsableMicelaneos: 'Argenis',
            formaPago: 'Financiado',
            banco: 'Popular',
            saldo: false,
            entregada: false,
            descargadaDGII: true
        },
        {
            id: 999002,
            codUnidad: 'PRJ_001-PALM-A102',
            edificio: 'PALM-A',
            unidad: '102',
            metraje: 115,
            estado: 'Disponible',
            nombre: '',
            telefono: '',
            correo: '',
            cedula: '',
            precio: 6500000,
            inicial: null,
            inicialDolar: null,
            pagado: 0,
            adeudado: 6500000,
            fechaCompletaInicial: null,
            fechaInicioVaciados: null,
            fechaEntregaInspeccion: null,
            fechaLegal: null,
            fechaGobierno: null,
            fechaMicelaneos: null,
            fechaInspeccion1: null,
            fechaInspeccion2: null,
            fechaFormaPago: null,
            iniciadoVaciados: false,
            enInspeccion: false,
            inspeccion1: false,
            inspeccion2: false,
            legal: false,
            gobierno: false,
            micelaneos: false,
            titulo: false,
            responsableLegal: '',
            responsableGobierno: '',
            responsableMicelaneos: '',
            formaPago: '',
            banco: '',
            saldo: false,
            entregada: false,
            descargadaDGII: false
        },
        {
            id: 999003,
            codUnidad: 'PRJ_001-PALM-B104',
            edificio: 'PALM-B',
            unidad: '104',
            metraje: 102,
            estado: 'Vendido',
            nombre: 'Juan Perez',
            telefono: '809-555-0001',
            correo: 'juan@example.com',
            cedula: '001-0000000-1',
            precio: 4800000,
            inicial: 960000,
            inicialDolar: 16500,
            pagado: 960000,
            adeudado: 3840000,
            fechaCompletaInicial: '2023-10-15',
            fechaInicioVaciados: '2024-01-20',
            fechaEntregaInspeccion: '2024-05-10',
            fechaLegal: '2023-11-05',
            fechaGobierno: null,
            fechaMicelaneos: null,
            fechaInspeccion1: '2024-05-15',
            fechaInspeccion2: null,
            fechaFormaPago: '2023-11-20',
            iniciadoVaciados: true,
            enInspeccion: true,
            inspeccion1: true,
            inspeccion2: false,
            legal: true,
            gobierno: false,
            micelaneos: false,
            titulo: false,
            responsableLegal: 'Argenis',
            responsableGobierno: 'Ivan',
            responsableMicelaneos: 'Marti',
            formaPago: 'Financiado',
            banco: 'Popular',
            saldo: false,
            entregada: false,
            descargadaDGII: false
        },
        {
            id: 999004,
            codUnidad: 'PRJ_001-PALM-B106',
            edificio: 'PALM-B',
            unidad: '106',
            metraje: 120,
            estado: 'Vendido',
            nombre: 'Maria Gomez',
            telefono: '829-555-0010',
            correo: 'maria@example.com',
            cedula: '031-0000000-5',
            precio: 7200000,
            inicial: 1440000,
            inicialDolar: 24800,
            pagado: 7200000,
            adeudado: 0,
            fechaCompletaInicial: '2023-08-10',
            fechaInicioVaciados: '2023-11-15',
            fechaEntregaInspeccion: '2024-03-22',
            fechaLegal: '2023-09-01',
            fechaGobierno: '2024-04-10',
            fechaMicelaneos: '2024-05-01',
            fechaInspeccion1: '2024-03-25',
            fechaInspeccion2: '2024-04-05',
            fechaFormaPago: '2023-09-15',
            iniciadoVaciados: true,
            enInspeccion: false,
            inspeccion1: true,
            inspeccion2: true,
            legal: true,
            gobierno: true,
            micelaneos: true,
            titulo: true,
            responsableLegal: 'Minerva',
            responsableGobierno: 'Wendy',
            responsableMicelaneos: 'Maureen',
            formaPago: 'Fondos Propios',
            banco: '',
            saldo: true,
            entregada: true,
            descargadaDGII: true
        },
        {
            id: 999005,
            codUnidad: 'PRJ_001-PALM-B107',
            edificio: 'PALM-B',
            unidad: '107',
            metraje: 110,
            estado: 'Vendido',
            nombre: 'Beatriz Mendez',
            telefono: '809-555-7788',
            correo: 'beatriz@example.com',
            cedula: '001-0882233-4',
            precio: 5500000,
            inicial: 1100000,
            inicialDolar: 19000,
            pagado: 2500000,
            adeudado: 3000000,
            fechaCompletaInicial: '2023-12-01',
            fechaInicioVaciados: '2024-03-15',
            fechaEntregaInspeccion: '2024-06-20',
            fechaLegal: '2023-12-15',
            fechaGobierno: null,
            fechaMicelaneos: null,
            fechaInspeccion1: null,
            fechaInspeccion2: null,
            fechaFormaPago: '2024-01-10',
            iniciadoVaciados: true,
            enInspeccion: false,
            inspeccion1: false,
            inspeccion2: false,
            legal: true,
            gobierno: false,
            micelaneos: false,
            titulo: false,
            responsableLegal: 'Wendy',
            responsableGobierno: 'Ivan',
            responsableMicelaneos: 'Marti',
            formaPago: 'Financiado',
            banco: 'Reservas',
            saldo: false,
            entregada: false,
            descargadaDGII: false
        }
    ],
    currentUser: null,
    isAuthenticated: false,
    selectedBuildingId: null,
    selectedUnitId: null,
    gridSize: 300,
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
};

export const setAppMode = (mode: 'edit' | 'view') => {
    appStore.appMode = mode;
    appStore.selectedBuildingId = null;
    appStore.selectedUnitId = null;
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
export const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
        id: `usr_${generateId()}`,
        ...userData
    };
    appStore.users.push(newUser);
    return newUser;
};

export const updateUser = (id: string, updates: Partial<User>) => {
    const user = appStore.users.find(u => u.id === id);
    if (user) {
        Object.assign(user, updates);
    }
};

export const updateProfile = (updates: Partial<User>) => {
    if (!appStore.currentUser) return;
    
    const userId = appStore.currentUser.id;
    
    // Update current session user
    Object.assign(appStore.currentUser, updates);
    
    // Update in users list
    const user = appStore.users.find(u => u.id === userId);
    if (user) {
        Object.assign(user, updates);
    }
    
    // Update localStorage
    localStorage.setItem('auth_user', JSON.stringify(appStore.currentUser));
};

export const deleteUser = (id: string) => {
    const index = appStore.users.findIndex(u => u.id === id);
    if (index > -1) {
        appStore.users.splice(index, 1);
    }
};

// Auth Actions
export const login = async (email: string, password?: string) => {
    // For this simulation, we'll just check if the user exists in our dummy list
    const user = appStore.users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === password
    );
    
    if (user) {
        appStore.currentUser = user;
        appStore.isAuthenticated = true;
        localStorage.setItem('auth_user', JSON.stringify(user));
        return true;
    }
    return false;
};

export const logout = () => {
    appStore.currentUser = null;
    appStore.isAuthenticated = false;
    localStorage.removeItem('auth_user');
};

export const checkAuth = () => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            appStore.currentUser = user;
            appStore.isAuthenticated = true;
        } catch (e) {
            localStorage.removeItem('auth_user');
        }
    }
};

// Auth Getters
export const getUserRole = () => appStore.currentUser?.role || 'viewer';
export const isAdmin = () => getUserRole() === 'admin';
export const isEditor = () => getUserRole() === 'editor' || isAdmin();
export const isViewer = () => getUserRole() === 'viewer';

export const canManageUsers = () => isAdmin();
export const canEditData = () => isEditor();
export const canDeleteData = () => isAdmin();

// Project Management Actions
export const addProject = (project: Project) => {
    appStore.projects.push(project);
};

export const updateProject = (id: string, updates: Partial<Project>) => {
    const project = appStore.projects.find(p => p.id === id);
    if (project) {
        Object.assign(project, updates);
    }
};

export const deleteProject = (id: string) => {
    const index = appStore.projects.findIndex(p => p.id === id);
    if (index > -1) {
        appStore.projects.splice(index, 1);
    }
};
