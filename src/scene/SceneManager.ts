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

    public syncBuildings(buildings: any[], visualFilters: any = null) {
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
            const unitHeight = 0.3; // Reduced from 0.5
            const padding = 0.03;   // Reduced from 0.05
            const baseHeight = 0.2; // Reduced from 0.4
            const roofHeight = 0.15; // Reduced from 0.3
            
            // Calculate total stack height for positioning
            const stackHeight = bld.units.length * (unitHeight + padding);
            
            // We set the group Y so the bottom of the base sits at 0
            // The body starts at baseHeight above 0
            const fullY = (stackHeight / 2) + baseHeight;
            group.position.set(bld.position.x, fullY, bld.position.z);

            const startY = -(stackHeight / 2); // Bottom of the building body (above the base)
            const labelY = startY + stackHeight + 0.3;

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

            // Sync Meshes (recreate units for simplicity but avoid clearing labels)
            const meshesToRemove = group.children.filter(c => !(c as any).isCSS2DObject);
            meshesToRemove.forEach(m => {
                if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
                group.remove(m);
            });

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
            footprint.position.y = startY;
            footprint.userData = { id: bld.id, isBuilding: true };
            group.add(footprint);

            const uW = bld.dimensions.width * 0.95;
            const uD = bld.dimensions.depth * 0.95;

            bld.units.forEach((unit: any, index: number) => {
                const colorHex = globalRulesEngine.resolveColor(unit);
                
                // Multi-criteria filter check
                let isHighlighted = true;
                if (visualFilters) {
                    if (visualFilters.status && unit.status !== visualFilters.status) isHighlighted = false;
                    if (visualFilters.bank && unit.bank !== visualFilters.bank) isHighlighted = false;
                    if (visualFilters.hasDebt !== null && !!unit.hasDebt !== visualFilters.hasDebt) isHighlighted = false;
                    if (visualFilters.enInspeccion !== null && !!unit.enInspeccion !== visualFilters.enInspeccion) isHighlighted = false;
                    if (visualFilters.legal !== null && !!unit.legal !== visualFilters.legal) isHighlighted = false;
                    if (visualFilters.titulo !== null && !!unit.titulo !== visualFilters.titulo) isHighlighted = false;
                    if (visualFilters.descargadaDGII !== null && !!unit.descargadaDGII !== visualFilters.descargadaDGII) isHighlighted = false;
                    if (visualFilters.saldo !== null && !!unit.saldo !== visualFilters.saldo) isHighlighted = false;
                }
                
                // 1. Unit Body
                const uMat = new THREE.MeshStandardMaterial({ 
                    color: colorHex,
                    roughness: 0.3,
                    metalness: 0.2,
                    emissive: new THREE.Color(colorHex),
                    emissiveIntensity: isHighlighted ? 0.1 : 0,
                    transparent: !isHighlighted,
                    opacity: isHighlighted ? 1 : 0.15
                });
                const uMesh = new THREE.Mesh(unitGeometry, uMat);
                uMesh.scale.set(uW, unitHeight, uD);
                const posY = startY + (index * (unitHeight + padding)) + (unitHeight / 2) + padding;
                uMesh.position.set(0, posY, 0);
                uMesh.userData = { id: unit.id, buildingId: bld.id, isUnit: true };
                group.add(uMesh);

                // 2. Unit Edges (Highlight)
                const edgesGeo = new THREE.EdgesGeometry(unitGeometry);
                const edgesMat = new THREE.LineBasicMaterial({ 
                    color: 0xffffff, 
                    transparent: true, 
                    opacity: isHighlighted ? 0.3 : 0.05 
                });
                const edgesLine = new THREE.LineSegments(edgesGeo, edgesMat);
                edgesLine.scale.set(uW, unitHeight, uD);
                edgesLine.position.copy(uMesh.position);
                edgesLine.userData = { id: unit.id, buildingId: bld.id, isUnit: true };
                group.add(edgesLine);
            });

            // 3. Add Roof Cap
            const roofGeo = new THREE.BoxGeometry(bld.dimensions.width * 0.98, roofHeight, bld.dimensions.depth * 0.98);
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 });
            const roof = new THREE.Mesh(roofGeo, roofMat);
            const roofY = startY + stackHeight + (roofHeight / 2);
            roof.position.set(0, roofY, 0);
            roof.userData = { id: bld.id, isBuilding: true };
            group.add(roof);

            // 4. Add Decorative Base
            const baseGeo = new THREE.BoxGeometry(bld.dimensions.width * 1.02, baseHeight, bld.dimensions.depth * 1.02);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.set(0, startY - (baseHeight / 2), 0);
            base.userData = { id: bld.id, isBuilding: true };
            group.add(base);

            // 5. Add Balconies (Architectural depth)
            const balconyGeo = new THREE.BoxGeometry(bld.dimensions.width * 0.15, 0.05, bld.dimensions.depth * 0.04);
            const balconyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
            
            bld.units.forEach((unit: any, index: number) => {
                // Determine highlight based on ALL criteria
                let isHighlighted = true;
                if (visualFilters) {
                    if (visualFilters.status && unit.status !== visualFilters.status) isHighlighted = false;
                    if (visualFilters.bank && unit.bank !== visualFilters.bank) isHighlighted = false;
                    if (visualFilters.hasDebt !== null && !!unit.hasDebt !== visualFilters.hasDebt) isHighlighted = false;
                    if (visualFilters.enInspeccion !== null && !!unit.enInspeccion !== visualFilters.enInspeccion) isHighlighted = false;
                    if (visualFilters.legal !== null && !!unit.legal !== visualFilters.legal) isHighlighted = false;
                    if (visualFilters.titulo !== null && !!unit.titulo !== visualFilters.titulo) isHighlighted = false;
                    if (visualFilters.descargadaDGII !== null && !!unit.descargadaDGII !== visualFilters.descargadaDGII) isHighlighted = false;
                    if (visualFilters.saldo !== null && !!unit.saldo !== visualFilters.saldo) isHighlighted = false;
                }
                
                const posY = startY + (index * (unitHeight + padding)) + (unitHeight / 2) + padding;
                // Add two balconies per unit on the front face
                for (let xOffset of [-bld.dimensions.width * 0.25, bld.dimensions.width * 0.25]) {
                    const balcony = new THREE.Mesh(balconyGeo, balconyMat);
                    balcony.position.set(xOffset, posY, bld.dimensions.depth * 0.49);
                    balcony.userData = { id: unit.id, buildingId: bld.id, isUnit: true };
                    
                    // Apply opacity to balcony as well
                    if (!isHighlighted) {
                        (balcony.material as THREE.Material).transparent = true;
                        (balcony.material as THREE.Material).opacity = 0.15;
                    }
                    
                    group.add(balcony);
                }
            });
        });
    }

    // Invisible floor plane used for raycasting drag positions
    private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private isDragging = false;
    private draggedGroup: THREE.Group | null = null;
    private dragOffset = new THREE.Vector3();

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

            const buildingsGroup = this.scene.getObjectByName('buildingsGroup');
            if (!buildingsGroup) return;

            const intersects = raycaster.intersectObjects(buildingsGroup.children, true);

            if (intersects.length > 0) {
                const hit = intersects[0].object as THREE.Mesh;

                // In 'edit' mode, start drag if we clicked any part of a building
                if (this.appMode === 'edit') {
                    // Find the parent Group (building group)
                    let parentGroup: THREE.Group | null = null;
                    let buildingId: string | null = null;

                    if (hit.userData.isBuilding) {
                        parentGroup = hit.parent as THREE.Group;
                        buildingId = hit.userData.id;
                    } else if (hit.userData.isUnit) {
                        parentGroup = hit.parent as THREE.Group;
                        buildingId = hit.userData.buildingId;
                    }

                    if (parentGroup) {
                        this.draggedGroup = parentGroup;
                        this.isDragging = false;
                        this.controls.enabled = false;
                        raycaster.ray.intersectPlane(this.floorPlane, floorIntersect);
                        this.dragOffset.copy(floorIntersect).sub(new THREE.Vector3(parentGroup.position.x, 0, parentGroup.position.z));

                        if (this.onObjectSelected && buildingId) {
                            this.onObjectSelected(buildingId, false);
                        }
                    }
                    return;
                }

                // View Mode — selection only
                if (this.onObjectSelected) {
                    if (hit.userData.isUnit) {
                        this.onObjectSelected(hit.userData.id, true);
                    } else if (hit.userData.isBuilding) {
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
            if (!this.draggedGroup) return;

            getPointerNDC(event);
            raycaster.setFromCamera(pointer, this.camera);

            if (raycaster.ray.intersectPlane(this.floorPlane, floorIntersect)) {
                const newX = floorIntersect.x - this.dragOffset.x;
                const newZ = floorIntersect.z - this.dragOffset.z;
                this.draggedGroup.position.x = newX;
                this.draggedGroup.position.z = newZ;
                this.isDragging = true;

                const id = this.draggedGroup.children.find(c => c.userData.isBuilding)?.userData.id;
                if (id && this.onBuildingMoved) {
                    this.onBuildingMoved(id, newX, newZ);
                }
            }
        });

        this.renderer.domElement.addEventListener('pointerup', () => {
            this.draggedGroup = null;
            this.controls.enabled = true;
            setTimeout(() => { this.isDragging = false; }, 50);
        });
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
