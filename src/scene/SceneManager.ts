// src/scene/SceneManager.ts
//@ts-ignore
import * as THREE from 'three';
//@ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//@ts-ignore
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { globalRulesEngine } from './RulesEngine';
import type { BlueprintTransform, Building, Unit } from '../models/types';

type UnitVisualFilters = {
    detailedUnitIds?: number[] | null;
    status?: string | null;
    bank?: string | null;
    hasDebt?: boolean | null;
    enInspeccion?: boolean | null;
    legal?: boolean | null;
    titulo?: boolean | null;
    descargadaDGII?: boolean | null;
    saldo?: boolean | null;
};

type UnitVisualKind = 'body' | 'edges' | 'balcony';

type UnitMaterialState = {
    color: number | THREE.Color;
    opacity: number;
    transparent: boolean;
};

export type CameraViewState = {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    zoom: number;
};

export class SceneManager {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public labelRenderer: CSS2DRenderer;
    public controls: OrbitControls;
    public appMode: 'edit' | 'view' = 'edit';
    public dragBuildingsEnabled: boolean = false;

    private container: HTMLElement;
    private animationId: number | null = null;
    private gridHelper: THREE.GridHelper | null = null;
    private currentGridSize: number = 300;
    private blueprintAspectRatio: number = 1;
    private blueprintLayoutBounds: { centerX: number; centerZ: number; width: number; depth: number } | null = null;
    private blueprintTransform: BlueprintTransform | null = null;
    private readonly onResizeHandler: () => void;
    private readonly minCameraY = 0.25;
    private readonly blueprintBoundsPadding = 1.12;
    private hasAutoFramedLayout = false;
    private resizeObserver: ResizeObserver | null = null;
    private blueprintLoadVersion = 0;
    private readonly unitGeometry = new THREE.BoxGeometry(1, 1, 1);
    private readonly unitEdgesGeometry = new THREE.EdgesGeometry(this.unitGeometry);
    private readonly selectedUnitColor = 0xd97706;
    private readonly defaultUnitEdgeColor = 0xcbd5e1;
    private readonly defaultBalconyColor = 0xe2e8f0;

    constructor(container: HTMLElement) {
        this.container = container;
        this.onResizeHandler = this.onWindowResize.bind(this);

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f2f5); // Light gray background

        // 2. Camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance optimization
        this.container.appendChild(this.renderer.domElement);

        // 3.1. Label Renderer
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(width, height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.container.appendChild(this.labelRenderer.domElement);

        // 4. Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.zoomToCursor = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02;

        // 5. Base Helpers
        this.setupHelpers();

        // 6. Raycaster
        this.setupRaycaster();

        // Event Listeners
        window.addEventListener('resize', this.onResizeHandler);
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(this.onResizeHandler);
            this.resizeObserver.observe(this.container);
        }
        requestAnimationFrame(this.onResizeHandler);
    }

    private setupHelpers() {
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.dispose();
        }
        // Default size 300, but we'll call setGridSize later if needed
        this.gridHelper = new THREE.GridHelper(300, 100, 0x888888, 0xcccccc);
        this.scene.add(this.gridHelper);
        // AxesHelper removed intentionally
    }

    public setGridSize(size: number) {
        this.currentGridSize = size;
        
        if (this.gridHelper) {
            const isVisible = this.gridHelper.visible;
            this.scene.remove(this.gridHelper);
            this.gridHelper.dispose();
            this.gridHelper = new THREE.GridHelper(size, size, 0x888888, 0xcccccc);
            this.gridHelper.visible = isVisible;
            this.scene.add(this.gridHelper);
        }

        this.updateBlueprintTransform();
    }

    public start() {
        if (!this.animationId) {
            this.animate();
        }
    }

    public stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    private animate = () => {
        this.animationId = requestAnimationFrame(this.animate);
        this.controls.update();
        this.keepCameraAbovePlane();
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    private keepCameraAbovePlane() {
        if (this.camera.position.y >= this.minCameraY && this.controls.target.y >= 0) return;

        this.camera.position.y = Math.max(this.camera.position.y, this.minCameraY);
        this.controls.target.y = Math.max(this.controls.target.y, 0);
    }

    private onWindowResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width <= 0 || height <= 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }

    public loadBlueprint(url: string) {
        const loadVersion = ++this.blueprintLoadVersion;
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(url, (texture: THREE.Texture) => {
            if (loadVersion !== this.blueprintLoadVersion) {
                texture.dispose();
                return;
            }

            this.clearBlueprint(false);

            // Create flat plane and scale it later according to layout bounds
            const imageAspect = texture.image.width / texture.image.height;
            this.blueprintAspectRatio = Number.isFinite(imageAspect) && imageAspect > 0 ? imageAspect : 1;
            const geometry = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: this.blueprintTransform?.opacity ?? 1,
                side: THREE.DoubleSide // make it visible from underneath just in case
            });

            const plane = new THREE.Mesh(geometry, material);
            plane.name = 'blueprint';

            // Rotate to lay flat on the ground
            plane.rotation.x = -Math.PI / 2;

            // Place slightly below the grid to avoid Z-fighting
            plane.position.y = -0.01;

            this.scene.add(plane);
            this.updateBlueprintTransform();

            // Hide the grid once a blueprint is loaded
            if (this.gridHelper) {
                this.gridHelper.visible = false;
            }
        });
    }

    public clearBlueprint(cancelPendingLoad = true) {
        if (cancelPendingLoad) {
            this.blueprintLoadVersion += 1;
        }

        const oldBlueprint = this.scene.getObjectByName('blueprint') as THREE.Mesh | null;
        if (!oldBlueprint) return;

        this.scene.remove(oldBlueprint);
        oldBlueprint.geometry.dispose();

        const material = oldBlueprint.material as THREE.MeshBasicMaterial;
        if (material.map) {
            material.map.dispose();
        }
        material.dispose();

        if (this.gridHelper) {
            this.gridHelper.visible = true;
        }
    }

    public setBlueprintTransform(transform: BlueprintTransform | null) {
        this.blueprintTransform = transform;
        this.updateBlueprintTransform();
    }

    public getAutoBlueprintTransform(): BlueprintTransform {
        return this.calculateAutoBlueprintTransform();
    }

    public getCameraViewState(): CameraViewState {
        return {
            position: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            target: {
                x: this.controls.target.x,
                y: this.controls.target.y,
                z: this.controls.target.z
            },
            zoom: this.camera.zoom
        };
    }

    public setCameraViewState(state: CameraViewState | null) {
        if (!state) return;

        this.camera.position.set(state.position.x, state.position.y, state.position.z);
        this.controls.target.set(state.target.x, state.target.y, state.target.z);
        this.camera.zoom = Number.isFinite(state.zoom) && state.zoom > 0 ? state.zoom : 1;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(this.controls.target);
        this.controls.update();
        this.hasAutoFramedLayout = true;
    }

    private disposeObjectResources(object: THREE.Object3D) {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry && mesh.geometry !== this.unitGeometry && mesh.geometry !== this.unitEdgesGeometry) {
            mesh.geometry.dispose();
        }

        const material = mesh.material;
        if (!material) return;

        const disposeMaterial = (item: THREE.Material) => {
            const materialWithMap = item as THREE.Material & { map?: THREE.Texture };
            if (materialWithMap.map) {
                materialWithMap.map.dispose();
            }
            item.dispose();
        };

        if (Array.isArray(material)) {
            material.forEach(disposeMaterial);
        } else {
            disposeMaterial(material);
        }
    }

    private normalizeText(value: unknown) {
        return String(value ?? '').trim().toLowerCase();
    }

    private softenColor(color: number, amount = 0.78) {
        return new THREE.Color(color).multiplyScalar(amount);
    }

    private isUnitHighlighted(unit: Unit, visualFilters: UnitVisualFilters | null = null) {
        if (!visualFilters) return true;
        if (
            Array.isArray(visualFilters.detailedUnitIds)
            && (unit.detailedUnitId === null || !visualFilters.detailedUnitIds.includes(unit.detailedUnitId))
        ) return false;
        if (visualFilters.status && unit.status !== visualFilters.status) return false;
        if (visualFilters.bank && this.normalizeText(unit.bank) !== this.normalizeText(visualFilters.bank)) return false;
        if (visualFilters.hasDebt !== null && visualFilters.hasDebt !== undefined && !!unit.hasDebt !== visualFilters.hasDebt) return false;
        if (visualFilters.enInspeccion !== null && visualFilters.enInspeccion !== undefined && !!unit.enInspeccion !== visualFilters.enInspeccion) return false;
        if (visualFilters.legal !== null && visualFilters.legal !== undefined && !!unit.legal !== visualFilters.legal) return false;
        if (visualFilters.titulo !== null && visualFilters.titulo !== undefined && !!unit.titulo !== visualFilters.titulo) return false;
        if (visualFilters.descargadaDGII !== null && visualFilters.descargadaDGII !== undefined && !!unit.descargadaDGII !== visualFilters.descargadaDGII) return false;
        if (visualFilters.saldo !== null && visualFilters.saldo !== undefined && !!unit.saldo !== visualFilters.saldo) return false;
        return true;
    }

    private getUnitMaterialState(unit: Unit, kind: UnitVisualKind, visualFilters: UnitVisualFilters | null, selectedUnitId: string | null): UnitMaterialState {
        const isSelectedUnit = selectedUnitId !== null && unit.id === selectedUnitId;
        const isHighlighted = this.isUnitHighlighted(unit, visualFilters);

        if (kind === 'edges') {
            return {
                color: isSelectedUnit ? this.selectedUnitColor : this.defaultUnitEdgeColor,
                opacity: isSelectedUnit ? 1 : (isHighlighted ? 0.3 : 0.05),
                transparent: true
            };
        }

        if (kind === 'balcony') {
            return {
                color: isSelectedUnit ? this.selectedUnitColor : this.defaultBalconyColor,
                opacity: isSelectedUnit ? 1 : (isHighlighted ? 1 : 0.15),
                transparent: isSelectedUnit ? false : !isHighlighted
            };
        }

        return {
            color: isSelectedUnit ? this.selectedUnitColor : this.softenColor(globalRulesEngine.resolveColor(unit)),
            opacity: isSelectedUnit ? 1 : (isHighlighted ? 1 : 0.15),
            transparent: !isHighlighted
        };
    }

    private applyUnitMaterialState(object: THREE.Object3D, state: UnitMaterialState) {
        const material = (object as THREE.Mesh | THREE.LineSegments).material;
        if (!material || Array.isArray(material)) return;

        const visualMaterial = material as THREE.MeshBasicMaterial | THREE.LineBasicMaterial;
        if (state.color instanceof THREE.Color) {
            visualMaterial.color.copy(state.color);
        } else {
            visualMaterial.color.setHex(state.color);
        }
        visualMaterial.opacity = state.opacity;
        visualMaterial.transparent = state.transparent;
        visualMaterial.needsUpdate = true;
    }

    public updateUnitVisualState(visualFilters: UnitVisualFilters | null = null, selectedUnitId: string | null = null) {
        const buildingsGroup = this.scene.getObjectByName('buildingsGroup');
        if (!buildingsGroup) return;

        buildingsGroup.traverse((object) => {
            const kind = object.userData.unitVisualKind as UnitVisualKind | undefined;
            const unit = object.userData.unitSnapshot as Unit | undefined;
            if (!kind || !unit) return;

            this.applyUnitMaterialState(
                object,
                this.getUnitMaterialState(unit, kind, visualFilters, selectedUnitId)
            );
        });
    }

    public syncBuildings(buildings: Building[], visualFilters: UnitVisualFilters | null = null, selectedUnitId: string | null = null) {
        this.updateBlueprintLayoutBounds(buildings);
        this.autoFrameLayout(buildings);

        let buildingsGroup = this.scene.getObjectByName('buildingsGroup') as THREE.Group;
        if (!buildingsGroup) {
            buildingsGroup = new THREE.Group();
            buildingsGroup.name = 'buildingsGroup';
            this.scene.add(buildingsGroup);
        }

        // 1. Identification of buildings to remove
        const newIds = new Set(buildings.map(b => b.id));
        const childrenToRemove = buildingsGroup.children.filter(c => !newIds.has(c.name));
        
        childrenToRemove.forEach(child => {
            // CRITICAL: Explicitly remove CSS2D labels from DOM
            child.traverse((obj) => {
                if ((obj as any).isCSS2DObject) {
                    (obj as any).element.remove();
                }
                this.disposeObjectResources(obj);
            });
            buildingsGroup.remove(child);
        });

        // 2. Update existing or Create new
        buildings.forEach(bld => {
            let group = buildingsGroup.getObjectByName(bld.id) as THREE.Group;
            
            if (!group) {
                group = new THREE.Group();
                group.name = bld.id;
                group.userData = { id: bld.id, isBuilding: true };
                buildingsGroup.add(group);
            }

            // 1. Constants and Positioning
            const buildingHeight = Math.max(1, Number(bld.dimensions.height) || 1);
            const padding = 0.03;
            const baseHeight = 0.2;
            const roofHeight = 0.15;
            const layoutCols = Math.max(1, Math.min(12, Math.round(Number(bld.layoutCols) || 2)));
            const layoutRows = Math.max(1, Math.min(12, Math.round(Number(bld.layoutRows) || 2)));
            const unitsPerFloor = layoutCols * layoutRows;

            const normalizedUnits: Array<{ unit: Unit; floor: number; slot: number }> = bld.units.map((unit: Unit, index: number) => {
                const fallbackFloor = Math.floor(index / unitsPerFloor) + 1;
                const fallbackSlot = index % unitsPerFloor;
                const floor = typeof unit.floor === 'number' && unit.floor > 0 ? unit.floor : fallbackFloor;
                const slot = typeof unit.slot === 'number' && unit.slot >= 0 && unit.slot < unitsPerFloor ? unit.slot : fallbackSlot;
                return { unit, floor, slot };
            });

            const maxFloor = Math.max(1, ...normalizedUnits.map((item) => item.floor));
            const stackHeight = buildingHeight;
            const floorStep = stackHeight / maxFloor;
            const unitHeight = Math.max(0.05, floorStep - padding);

            // We set the group Y so the bottom of the base sits at 0
            const fullY = (stackHeight / 2) + baseHeight;
            group.position.set(bld.position.x, fullY, bld.position.z);

            const startY = -(stackHeight / 2) + (unitHeight / 2);
            const bodyBottomY = startY - (unitHeight / 2);
            const topUnitCenterY = startY + ((maxFloor - 1) * floorStep);
            const bodyTopY = topUnitCenterY + (unitHeight / 2);
            const labelY = bodyTopY + roofHeight + 0.3;

            // Update Label
            let labelObj = group.children.find(c => (c as any).isCSS2DObject) as any;
            if (labelObj) {
                if (labelObj.element.textContent !== bld.name) {
                    labelObj.element.textContent = bld.name;
                }
                labelObj.position.set(0, labelY, 0);
            } else {
                const labelDiv = document.createElement('div');
                labelDiv.className = 'building-label';
                labelDiv.textContent = bld.name;
                const label = new CSS2DObject(labelDiv);
                label.position.set(0, labelY, 0);
                group.add(label);
            }

            group.rotation.y = THREE.MathUtils.degToRad(bld.rotationY ?? 0);

            // Sync Meshes (recreate units for simplicity but avoid clearing labels)
            const meshesToRemove = group.children.filter(c => !(c as any).isCSS2DObject);
            meshesToRemove.forEach(m => {
                this.disposeObjectResources(m);
                group.remove(m);
            });

            // Re-add pick surfaces, footprint and units
            const buildingPickGeo = new THREE.BoxGeometry(
                bld.dimensions.width * 1.04,
                Math.max(stackHeight + baseHeight + roofHeight + padding, 1),
                bld.dimensions.depth * 1.04
            );
            const buildingPickMat = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0,
                depthWrite: false
            });
            const buildingPick = new THREE.Mesh(buildingPickGeo, buildingPickMat);
            buildingPick.position.set(0, 0, 0);
            buildingPick.userData = { id: bld.id, buildingId: bld.id, isBuildingPick: true };
            group.add(buildingPick);

            // Re-add footprint and units
            const footprintGeo = new THREE.PlaneGeometry(bld.dimensions.width, bld.dimensions.depth);
            const footprintMat = new THREE.MeshBasicMaterial({
                color: 0x4488ff,
                transparent: true,
                opacity: 0.15,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const footprint = new THREE.Mesh(footprintGeo, footprintMat);
            footprint.rotation.x = -Math.PI / 2;
            footprint.position.y = bodyBottomY;
            footprint.userData = { id: bld.id, buildingId: bld.id, isBuildingVisual: true };
            group.add(footprint);

            const innerWidth = bld.dimensions.width * 0.92;
            const innerDepth = bld.dimensions.depth * 0.92;
            const gapX = layoutCols > 1 ? Math.min(0.08, innerWidth * 0.08) : 0;
            const gapZ = layoutRows > 1 ? Math.min(0.08, innerDepth * 0.08) : 0;
            const totalGapX = gapX * (layoutCols - 1);
            const totalGapZ = gapZ * (layoutRows - 1);
            const uW = (innerWidth - totalGapX) / layoutCols;
            const uD = (innerDepth - totalGapZ) / layoutRows;

            const getUnitPosition = (floor: number, slot: number) => {
                const floorY = startY + ((floor - 1) * floorStep);
                const row = Math.floor(slot / layoutCols);
                const col = slot % layoutCols;
                const localX = (-innerWidth / 2) + (uW / 2) + (col * (uW + gapX));
                const localZ = (-innerDepth / 2) + (uD / 2) + (row * (uD + gapZ));
                return new THREE.Vector3(localX, floorY, localZ);
            };

            normalizedUnits.forEach(({ unit, floor, slot }: { unit: Unit; floor: number; slot: number }) => {
                const unitBodyState = this.getUnitMaterialState(unit, 'body', visualFilters, selectedUnitId);

                // 1. Unit Body
                const uMat = new THREE.MeshBasicMaterial({
                    color: unitBodyState.color,
                    transparent: unitBodyState.transparent,
                    opacity: unitBodyState.opacity
                });
                const uMesh = new THREE.Mesh(this.unitGeometry, uMat);
                uMesh.scale.set(uW, unitHeight, uD);
                uMesh.position.copy(getUnitPosition(floor, slot));
                uMesh.userData = { id: unit.id, buildingId: bld.id, isUnitVisual: true, unitVisualKind: 'body', unitSnapshot: { ...unit } };
                group.add(uMesh);

                const unitPickGeo = new THREE.BoxGeometry(uW * 1.1, unitHeight * 1.5, uD * 1.1);
                const unitPickMat = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false
                });
                const unitPick = new THREE.Mesh(unitPickGeo, unitPickMat);
                unitPick.position.copy(uMesh.position);
                unitPick.userData = { id: unit.id, buildingId: bld.id, isUnitPick: true };
                group.add(unitPick);

                // 2. Unit Edges (Highlight)
                const unitEdgesState = this.getUnitMaterialState(unit, 'edges', visualFilters, selectedUnitId);
                const edgesMat = new THREE.LineBasicMaterial({ 
                    color: unitEdgesState.color,
                    transparent: unitEdgesState.transparent,
                    opacity: unitEdgesState.opacity
                });
                const edgesLine = new THREE.LineSegments(this.unitEdgesGeometry, edgesMat);
                edgesLine.scale.set(uW, unitHeight, uD);
                edgesLine.position.copy(uMesh.position);
                edgesLine.userData = { id: unit.id, buildingId: bld.id, isUnitVisual: true, unitVisualKind: 'edges', unitSnapshot: { ...unit } };
                group.add(edgesLine);
            });

            // 3. Add Decorative Base
            const baseGeo = new THREE.BoxGeometry(bld.dimensions.width * 1.02, baseHeight, bld.dimensions.depth * 1.02);
            const baseMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.set(0, bodyBottomY - (baseHeight / 2), 0);
            base.userData = { id: bld.id, isBuilding: true };
            group.add(base);

            // 4. Add Balconies (Architectural depth)
            const balconyGeo = new THREE.BoxGeometry(uW * 0.55, 0.05, uD * 0.08);

            normalizedUnits.forEach(({ unit, floor, slot }: { unit: Unit; floor: number; slot: number }) => {
                const balconyState = this.getUnitMaterialState(unit, 'balcony', visualFilters, selectedUnitId);
                const basePos = getUnitPosition(floor, slot);
                const balconyMaterial = new THREE.MeshBasicMaterial({
                    color: balconyState.color,
                    transparent: balconyState.transparent,
                    opacity: balconyState.opacity
                });
                const balcony = new THREE.Mesh(balconyGeo, balconyMaterial);
                balcony.position.set(basePos.x, basePos.y, basePos.z + (uD * 0.5) + 0.01);
                balcony.userData = { id: unit.id, buildingId: bld.id, isUnitVisual: true, unitVisualKind: 'balcony', unitSnapshot: { ...unit } };
                group.add(balcony);
            });
        });

        // Keep blueprint aligned with the current layout bounds after every sync.
        // Without this, depending on async load order between layout and image,
        // the blueprint can keep an old scale and look "descuadrado" across views.
        this.updateBlueprintTransform();
    }

    private autoFrameLayout(buildings: Building[]) {
        if (this.hasAutoFramedLayout) return;

        if (!Array.isArray(buildings) || buildings.length === 0 || !this.blueprintLayoutBounds) {
            this.hasAutoFramedLayout = false;
            return;
        }

        const maxBuildingHeight = Math.max(
            1,
            ...buildings.map((building) => Math.max(1, Number(building.dimensions?.height) || 1))
        );
        const layoutSize = Math.max(this.blueprintLayoutBounds.width, this.blueprintLayoutBounds.depth, maxBuildingHeight * 1.4, 12);
        const distance = layoutSize * 0.65;
        const target = new THREE.Vector3(
            this.blueprintLayoutBounds.centerX,
            maxBuildingHeight * 0.28,
            this.blueprintLayoutBounds.centerZ
        );

        this.controls.target.copy(target);
        this.camera.position.set(
            target.x,
            Math.max(maxBuildingHeight * 1.35, distance * 1.05),
            target.z + Math.max(layoutSize * 0.02, 0.1)
        );
        this.camera.lookAt(target);
        this.controls.update();
        this.hasAutoFramedLayout = true;
    }

    private updateBlueprintLayoutBounds(buildings: any[]) {
        if (!Array.isArray(buildings) || buildings.length === 0) {
            this.blueprintLayoutBounds = null;
            return;
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;

        buildings.forEach((building) => {
            const width = Math.max(0, Number(building.dimensions?.width) || 0);
            const depth = Math.max(0, Number(building.dimensions?.depth) || 0);
            const positionX = Number(building.position?.x);
            const positionZ = Number(building.position?.z);
            if (!Number.isFinite(width) || !Number.isFinite(depth) || !Number.isFinite(positionX) || !Number.isFinite(positionZ)) return;

            const rotation = THREE.MathUtils.degToRad(Number(building.rotationY) || 0);
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            const halfWidth = width / 2;
            const halfDepth = depth / 2;
            const corners = [
                { x: -halfWidth, z: -halfDepth },
                { x: halfWidth, z: -halfDepth },
                { x: halfWidth, z: halfDepth },
                { x: -halfWidth, z: halfDepth }
            ];

            corners.forEach((corner) => {
                const worldX = positionX + (corner.x * cos) - (corner.z * sin);
                const worldZ = positionZ + (corner.x * sin) + (corner.z * cos);
                minX = Math.min(minX, worldX);
                maxX = Math.max(maxX, worldX);
                minZ = Math.min(minZ, worldZ);
                maxZ = Math.max(maxZ, worldZ);
            });
        });

        if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minZ) || !Number.isFinite(maxZ)) {
            this.blueprintLayoutBounds = null;
            return;
        }

        const width = Math.max(1, (maxX - minX) * this.blueprintBoundsPadding);
        const depth = Math.max(1, (maxZ - minZ) * this.blueprintBoundsPadding);

        this.blueprintLayoutBounds = {
            centerX: (minX + maxX) / 2,
            centerZ: (minZ + maxZ) / 2,
            width,
            depth
        };
    }

    // Invisible floor plane used for raycasting drag positions
    private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private isDragging = false;
    private draggedGroup: THREE.Group | null = null;
    private dragOffset = new THREE.Vector3();
    private pointerDownPos: { x: number; y: number } | null = null;
    private pendingDragGroup: THREE.Group | null = null;
    private dragThresholdPx = 4;
    private dragSnapStep = 0.1;
    private lastDragPosition: { id: string; x: number; z: number } | null = null;

    private setupRaycaster() {
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const floorIntersect = new THREE.Vector3();

        const getPointerNDC = (event: MouseEvent) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        };

        this.renderer.domElement.addEventListener('pointerdown', (event: MouseEvent) => {
            getPointerNDC(event);
            raycaster.setFromCamera(pointer, this.camera);
            this.pointerDownPos = { x: event.clientX, y: event.clientY };
            this.pendingDragGroup = null;

            const buildingsGroup = this.scene.getObjectByName('buildingsGroup');
            if (!buildingsGroup) return;

            const intersects = raycaster.intersectObjects(buildingsGroup.children, true);
            const unitHit = intersects.find(hit => hit.object.userData.isUnitPick);
            const buildingHit = intersects.find(hit => hit.object.userData.isBuildingPick);

            if (unitHit || buildingHit) {
                const hit = (unitHit || buildingHit)!.object as THREE.Mesh;

                // In 'edit' mode, start drag if we clicked any part of a building
                if (this.appMode === 'edit') {
                    if (!this.dragBuildingsEnabled && hit.userData.isUnitPick) {
                        if (this.onObjectSelected) {
                            this.onObjectSelected(hit.userData.id, true);
                        }
                        return;
                    }

                    const buildingGroup = this.findBuildingGroup(hit);
                    if (buildingGroup) {
                        if (this.dragBuildingsEnabled) {
                            this.pendingDragGroup = buildingGroup;
                            this.draggedGroup = buildingGroup;
                            this.controls.enabled = false;
                        }
                        if (this.onObjectSelected) {
                            if (this.dragBuildingsEnabled) {
                                const buildingId = buildingGroup.userData?.id || hit.userData.id || null;
                                this.onObjectSelected(buildingId, false);
                            } else if (hit.userData.isUnitPick) {
                                this.onObjectSelected(hit.userData.id, true);
                            } else {
                                const buildingId = buildingGroup.userData?.id || hit.userData.id || null;
                                this.onObjectSelected(buildingId, false);
                            }
                        }
                    }
                    return;
                }

                // View Mode â€” selection only
                if (this.onObjectSelected) {
                    if (hit.userData.isUnitPick) {
                        this.onObjectSelected(hit.userData.id, true);
                    } else if (hit.userData.isBuildingPick) {
                        this.onObjectSelected(hit.userData.id, false);
                    }
                }
            } else {
                if (this.onObjectSelected && !this.isDragging) {
                    this.onObjectSelected(null, false);
                }
            }
        });

        this.renderer.domElement.addEventListener('pointermove', (event: MouseEvent) => {
            if (!this.dragBuildingsEnabled || (!this.pendingDragGroup && !this.draggedGroup)) return;

            getPointerNDC(event);
            raycaster.setFromCamera(pointer, this.camera);

            if (this.pendingDragGroup && !this.isDragging && this.pointerDownPos) {
                const dx = event.clientX - this.pointerDownPos.x;
                const dy = event.clientY - this.pointerDownPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance >= this.dragThresholdPx) {
                    this.draggedGroup = this.pendingDragGroup;
                    this.pendingDragGroup = null;
                    this.isDragging = false;
                    this.controls.enabled = false;
                    raycaster.ray.intersectPlane(this.floorPlane, floorIntersect);
                    this.dragOffset.copy(floorIntersect).sub(new THREE.Vector3(this.draggedGroup.position.x, 0, this.draggedGroup.position.z));

                    const buildingId = this.draggedGroup.userData?.id || this.draggedGroup.children.find(c => c.userData.isBuildingPick)?.userData.id;
                    if (this.onObjectSelected && buildingId) {
                        this.onObjectSelected(buildingId, false);
                    }
                }
            }

            if (raycaster.ray.intersectPlane(this.floorPlane, floorIntersect)) {
                const newX = floorIntersect.x - this.dragOffset.x;
                const newZ = floorIntersect.z - this.dragOffset.z;
                if (this.draggedGroup) {
                    const snappedX = Math.round(newX / this.dragSnapStep) * this.dragSnapStep;
                    const snappedZ = Math.round(newZ / this.dragSnapStep) * this.dragSnapStep;
                    this.draggedGroup.position.x = snappedX;
                    this.draggedGroup.position.z = snappedZ;
                    this.isDragging = true;

                    const id = this.draggedGroup.userData?.id || this.draggedGroup.children.find(c => c.userData.isBuildingPick)?.userData.id;
                    if (id) {
                        this.lastDragPosition = { id, x: snappedX, z: snappedZ };
                    }
                }
            }
        });

        const finishDrag = () => {
            if (this.lastDragPosition && this.onBuildingMoved) {
                this.onBuildingMoved(this.lastDragPosition.id, this.lastDragPosition.x, this.lastDragPosition.z);
            }

            this.draggedGroup = null;
            this.pendingDragGroup = null;
            this.pointerDownPos = null;
            this.lastDragPosition = null;
            this.controls.enabled = true;
            setTimeout(() => { this.isDragging = false; }, 50);
        };

        this.renderer.domElement.addEventListener('pointerup', finishDrag);
        this.renderer.domElement.addEventListener('pointercancel', finishDrag);
        this.renderer.domElement.addEventListener('pointerleave', () => {
            if (this.isDragging) finishDrag();
        });

        this.updateBlueprintTransform();
    }

    private updateBlueprintTransform() {
        const blueprint = this.scene.getObjectByName('blueprint') as THREE.Mesh | null;
        if (!blueprint) return;

        const transform = this.blueprintTransform ?? this.calculateAutoBlueprintTransform();
        blueprint.scale.set(transform.width, transform.depth, 1);
        blueprint.rotation.set(-Math.PI / 2, 0, THREE.MathUtils.degToRad(transform.rotationY));
        blueprint.position.set(transform.x, -0.01, transform.z);

        const material = blueprint.material as THREE.MeshBasicMaterial;
        material.opacity = transform.opacity;
        material.transparent = transform.opacity < 1;
    }

    private calculateAutoBlueprintTransform(): BlueprintTransform {
        const targetBounds = this.blueprintLayoutBounds;
        const targetWidth = targetBounds?.width ?? this.currentGridSize * 0.8;
        const targetDepth = targetBounds?.depth ?? this.currentGridSize * 0.8;
        const centerX = targetBounds?.centerX ?? 0;
        const centerZ = targetBounds?.centerZ ?? 0;

        const targetRatio = targetWidth / Math.max(targetDepth, 0.0001);
        let planeWidth: number;
        let planeDepth: number;

        // Keep blueprint scale independent from buildings so manual edits do not resize the plan.
        if (this.blueprintAspectRatio > targetRatio) {
            planeDepth = targetDepth;
            planeWidth = planeDepth * this.blueprintAspectRatio;
        } else {
            planeWidth = targetWidth;
            planeDepth = planeWidth / this.blueprintAspectRatio;
        }

        return {
            x: centerX,
            z: centerZ,
            width: planeWidth,
            depth: planeDepth,
            rotationY: 0,
            opacity: 1
        };
    }

    private findBuildingGroup(object: THREE.Object3D): THREE.Group | null {
        let current: THREE.Object3D | null = object;
        while (current) {
            if ((current as THREE.Group).isGroup && current.userData?.isBuilding) {
                return current as THREE.Group;
            }
            current = current.parent;
        }
        return null;
    }

    public updateDragControlsState() {
        // No-op: mode is checked inline within the pointer handler
    }

    public onObjectSelected: ((id: string | null, isUnit: boolean) => void) | null = null;
    public onBuildingMoved: ((id: string, x: number, z: number) => void) | null = null;

    public dispose() {
        this.stop();
        window.removeEventListener('resize', this.onResizeHandler);
        this.resizeObserver?.disconnect();
        this.clearBlueprint();
        if (this.container && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
        if (this.container && this.labelRenderer.domElement) {
            this.container.removeChild(this.labelRenderer.domElement);
        }
        this.unitEdgesGeometry.dispose();
        this.unitGeometry.dispose();
        this.renderer.dispose();
    }
}

