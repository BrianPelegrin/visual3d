// src/scene/SceneManager.ts
//@ts-ignore
import * as THREE from 'three';
//@ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//@ts-ignore
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { globalRulesEngine } from './RulesEngine';

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

    constructor(container: HTMLElement) {
        this.container = container;

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

        // 5. Lights
        this.setupLights();

        // 6. Base Helpers
        this.setupHelpers();

        // 7. Raycaster
        this.setupRaycaster();

        // Event Listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
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
        const oldSize = this.currentGridSize;
        this.currentGridSize = size;
        
        if (this.gridHelper) {
            const isVisible = this.gridHelper.visible;
            this.scene.remove(this.gridHelper);
            this.gridHelper.dispose();
            this.gridHelper = new THREE.GridHelper(size, size, 0x888888, 0xcccccc);
            this.gridHelper.visible = isVisible;
            this.scene.add(this.gridHelper);
        }

        // Scale blueprint if exists
        const blueprint = this.scene.getObjectByName('blueprint');
        if (blueprint) {
            const scaleFactor = size / oldSize;
            blueprint.scale.x *= scaleFactor;
            blueprint.scale.y *= scaleFactor;
        }
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
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    private onWindowResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }

    public loadBlueprint(url: string) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(url, (texture: THREE.Texture) => {
            // Remove old blueprint if exists (simplified for now)
            const oldBlueprint = this.scene.getObjectByName('blueprint');
            if (oldBlueprint) {
                this.scene.remove(oldBlueprint);
                (oldBlueprint as THREE.Mesh).geometry.dispose();
                ((oldBlueprint as THREE.Mesh).material as THREE.Material).dispose();
            }

            // Create flat plane
            const imageAspect = texture.image.width / texture.image.height;
            // Base blueprint size on 80% of current grid size
            const geometryWidth = this.currentGridSize * 0.8;
            const geometryHeight = geometryWidth / imageAspect;

            const geometry = new THREE.PlaneGeometry(geometryWidth, geometryHeight);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide // make it visible from underneath just in case
            });

            const plane = new THREE.Mesh(geometry, material);
            plane.name = 'blueprint';

            // Rotate to lay flat on the ground
            plane.rotation.x = -Math.PI / 2;

            // Place slightly below the grid to avoid Z-fighting
            plane.position.y = -0.01;

            this.scene.add(plane);

            // Hide the grid once a blueprint is loaded
            if (this.gridHelper) {
                this.gridHelper.visible = false;
            }
        });
    }

    public syncBuildings(buildings: any[], visualFilters: any = null, selectedUnitId: string | null = null) {
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
                if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
                if ((obj as THREE.Mesh).material) {
                    if (Array.isArray((obj as THREE.Mesh).material)) {
                        ((obj as THREE.Mesh).material as THREE.Material[]).forEach(m => m.dispose());
                    } else {
                        ((obj as THREE.Mesh).material as THREE.Material).dispose();
                    }
                }
            });
            buildingsGroup.remove(child);
        });

        const unitGeometry = new THREE.BoxGeometry(1, 1, 1);

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
            const unitHeight = 0.3;
            const padding = 0.03;
            const baseHeight = 0.2;
            const roofHeight = 0.15;
            const layoutCols = Math.max(1, Math.min(12, Math.round(Number(bld.layoutCols) || 2)));
            const layoutRows = Math.max(1, Math.min(12, Math.round(Number(bld.layoutRows) || 2)));
            const unitsPerFloor = layoutCols * layoutRows;

            const normalizedUnits: Array<{ unit: any; floor: number; slot: number }> = bld.units.map((unit: any, index: number) => {
                const fallbackFloor = Math.floor(index / unitsPerFloor) + 1;
                const fallbackSlot = index % unitsPerFloor;
                const floor = typeof unit.floor === 'number' && unit.floor > 0 ? unit.floor : fallbackFloor;
                const slot = typeof unit.slot === 'number' && unit.slot >= 0 && unit.slot < unitsPerFloor ? unit.slot : fallbackSlot;
                return { unit, floor, slot };
            });

            const maxFloor = Math.max(1, ...normalizedUnits.map((item) => item.floor));
            const floorStep = unitHeight + padding;
            const stackHeight = maxFloor * floorStep;

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
                if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
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

            const normalizeText = (value: unknown) => String(value ?? '').trim().toLowerCase();
            const isUnitHighlighted = (unit: any) => {
                if (!visualFilters) return true;
                if (visualFilters.status && unit.status !== visualFilters.status) return false;
                if (visualFilters.bank && normalizeText(unit.bank) !== normalizeText(visualFilters.bank)) return false;
                if (visualFilters.hasDebt !== null && !!unit.hasDebt !== visualFilters.hasDebt) return false;
                if (visualFilters.enInspeccion !== null && !!unit.enInspeccion !== visualFilters.enInspeccion) return false;
                if (visualFilters.legal !== null && !!unit.legal !== visualFilters.legal) return false;
                if (visualFilters.titulo !== null && !!unit.titulo !== visualFilters.titulo) return false;
                if (visualFilters.descargadaDGII !== null && !!unit.descargadaDGII !== visualFilters.descargadaDGII) return false;
                if (visualFilters.saldo !== null && !!unit.saldo !== visualFilters.saldo) return false;
                return true;
            };

            normalizedUnits.forEach(({ unit, floor, slot }: { unit: any; floor: number; slot: number }) => {
                const colorHex = globalRulesEngine.resolveColor(unit);
                const isSelectedUnit = selectedUnitId !== null && unit.id === selectedUnitId;
                
                // Multi-criteria filter check
                const isHighlighted = isUnitHighlighted(unit);
                
                // 1. Unit Body
                const uMat = new THREE.MeshStandardMaterial({ 
                    color: isSelectedUnit ? 0xf59e0b : colorHex,
                    roughness: 0.3,
                    metalness: 0.2,
                    emissive: new THREE.Color(isSelectedUnit ? 0xfbbf24 : colorHex),
                    emissiveIntensity: isSelectedUnit ? 0.55 : (isHighlighted ? 0.1 : 0),
                    transparent: !isHighlighted,
                    opacity: isSelectedUnit ? 1 : (isHighlighted ? 1 : 0.15)
                });
                const uMesh = new THREE.Mesh(unitGeometry, uMat);
                uMesh.scale.set(uW, unitHeight, uD);
                uMesh.position.copy(getUnitPosition(floor, slot));
                uMesh.userData = { id: unit.id, buildingId: bld.id, isUnitVisual: true };
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
                const edgesGeo = new THREE.EdgesGeometry(unitGeometry);
                const edgesMat = new THREE.LineBasicMaterial({ 
                    color: isSelectedUnit ? 0xf59e0b : 0xffffff, 
                    transparent: true, 
                    opacity: isSelectedUnit ? 1 : (isHighlighted ? 0.3 : 0.05)
                });
                const edgesLine = new THREE.LineSegments(edgesGeo, edgesMat);
                edgesLine.scale.set(uW, unitHeight, uD);
                edgesLine.position.copy(uMesh.position);
                edgesLine.userData = { id: unit.id, buildingId: bld.id, isUnitVisual: true };
                group.add(edgesLine);
            });

            // 3. Add Decorative Base
            const baseGeo = new THREE.BoxGeometry(bld.dimensions.width * 1.02, baseHeight, bld.dimensions.depth * 1.02);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.set(0, bodyBottomY - (baseHeight / 2), 0);
            base.userData = { id: bld.id, isBuilding: true };
            group.add(base);

            // 4. Add Balconies (Architectural depth)
            const balconyGeo = new THREE.BoxGeometry(uW * 0.55, 0.05, uD * 0.08);

            normalizedUnits.forEach(({ unit, floor, slot }: { unit: any; floor: number; slot: number }) => {
                const isSelectedUnit = selectedUnitId !== null && unit.id === selectedUnitId;
                // Determine highlight based on ALL criteria
                const isHighlighted = isUnitHighlighted(unit);

                const basePos = getUnitPosition(floor, slot);
                const balconyMaterial = new THREE.MeshStandardMaterial({
                    color: isSelectedUnit ? 0xf59e0b : 0xffffff,
                    roughness: 0.2,
                    transparent: isSelectedUnit ? false : !isHighlighted,
                    opacity: isSelectedUnit ? 1 : (isHighlighted ? 1 : 0.15)
                });
                const balcony = new THREE.Mesh(balconyGeo, balconyMaterial);
                balcony.position.set(basePos.x, basePos.y, basePos.z + (uD * 0.5) + 0.01);
                balcony.userData = { id: unit.id, buildingId: bld.id, isUnitVisual: true };
                group.add(balcony);
            });
        });
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
                    if (id && this.onBuildingMoved) {
                        this.onBuildingMoved(id, snappedX, snappedZ);
                    }
                }
            }
        });

        this.renderer.domElement.addEventListener('pointerup', () => {
            this.draggedGroup = null;
            this.pendingDragGroup = null;
            this.pointerDownPos = null;
            this.controls.enabled = true;
            setTimeout(() => { this.isDragging = false; }, 50);
        });
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
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        if (this.container && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
        if (this.container && this.labelRenderer.domElement) {
            this.container.removeChild(this.labelRenderer.domElement);
        }
        this.renderer.dispose();
    }
}

